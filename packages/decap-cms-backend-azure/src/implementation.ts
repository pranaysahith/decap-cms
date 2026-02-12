import trimStart from 'lodash/trimStart';
import trim from 'lodash/trim';
import semaphore from 'semaphore';
import {
  AccessTokenError,
  basename,
  getMediaDisplayURL,
  generateContentKey,
  getMediaAsBlob,
  getPreviewStatus,
  asyncLock,
  runWithLock,
  unpublishedEntries,
  entriesByFiles,
  filterByExtension,
  branchFromContentKey,
  entriesByFolder,
  contentKeyFromBranch,
  getBlobSHA,
  unsentRequest,
} from 'decap-cms-lib-util';

import AuthenticationPage from './AuthenticationPage';
import API, { API_NAME } from './API';

import type { Semaphore } from 'semaphore';
import type {
  ApiRequest,
  Credentials,
  Implementation,
  ImplementationFile,
  ImplementationMediaFile,
  DisplayURL,
  Entry,
  AssetProxy,
  PersistOptions,
  Config,
  AsyncLock,
  User,
  UnpublishedEntryMediaFile,
} from 'decap-cms-lib-util';

const MAX_CONCURRENT_DOWNLOADS = 10;

function parseAzureRepo(config: Config) {
  const { repo } = config.backend;

  if (typeof repo !== 'string') {
    throw new Error('The Azure backend needs a "repo" in the backend configuration.');
  }

  const parts = repo.split('/');
  if (parts.length !== 3) {
    throw new Error('The Azure backend must be in a the format of {org}/{project}/{repo}');
  }

  const [org, project, repoName] = parts;
  return {
    org,
    project,
    repoName,
  };
}

export default class Azure implements Implementation {
  lock: AsyncLock;
  api?: API;
  updateUserCredentials: (args: { token: string; refresh_token: string }) => Promise<null>;
  options: {
    updateUserCredentials: (args: { token: string; refresh_token: string }) => Promise<null>;
    initialWorkflowStatus: string;
  };
  repo: {
    org: string;
    project: string;
    repoName: string;
  };
  branch: string;
  apiRoot: string;
  apiVersion: string;
  authType: string;
  appId: string;
  authScope: string;
  authTokenUrl: string;
  authTokenEndpointContentType: string;
  token: string | null;
  refreshToken?: string;
  refreshedTokenPromise?: Promise<string>;
  squashMerges: boolean;
  cmsLabelPrefix: string;
  mediaFolder: string;
  previewContext: string;

  _mediaDisplayURLSem?: Semaphore;

  constructor(config: Config, options = {}) {
    this.options = {
      updateUserCredentials: async () => null,
      initialWorkflowStatus: '',
      ...options,
    };
    this.updateUserCredentials = this.options.updateUserCredentials;

    this.repo = parseAzureRepo(config);
    const backendConfig = config.backend as Config['backend'] & {
      tenant_id?: string;
      auth_scope?: string;
      auth_token_endpoint?: string;
      auth_token_endpoint_content_type?: string;
      base_url?: string;
    };
    const tenantId = backendConfig.tenant_id || '';
    const baseUrl =
      backendConfig.base_url || `https://login.microsoftonline.com/${tenantId}`;
    const authTokenEndpoint = backendConfig.auth_token_endpoint || 'oauth2/v2.0/token';
    const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
    const trimmedAuthTokenEndpoint = authTokenEndpoint.replace(/^\/+/, '');

    this.branch = config.backend.branch || 'master';
    this.apiRoot = config.backend.api_root || 'https://dev.azure.com';
    this.apiVersion = config.backend.api_version || '6.1-preview';
    this.authType = config.backend.auth_type || 'implicit';
    this.appId = config.backend.app_id || '';
    this.authScope =
      backendConfig.auth_scope || '499b84ac-1321-427f-aa17-267ca6975798/user_impersonation';
    this.authTokenUrl = `${trimmedBaseUrl}/${trimmedAuthTokenEndpoint}`;
    this.authTokenEndpointContentType =
      backendConfig.auth_token_endpoint_content_type ||
      'application/x-www-form-urlencoded; charset=utf-8';
    this.token = '';
    this.squashMerges = config.backend.squash_merges || false;
    this.cmsLabelPrefix = config.backend.cms_label_prefix || '';
    this.mediaFolder = trim(config.media_folder, '/');
    this.previewContext = config.backend.preview_context || '';
    this.lock = asyncLock();
  }

  isGitBackend() {
    return true;
  }

  async status() {
    const auth =
      (await this.api!.user()
        .then(user => !!user)
        .catch(e => {
          console.warn('Failed getting Azure user', e);
          return false;
        })) || false;

    return { auth: { status: auth }, api: { status: true, statusPage: '' } };
  }

  authComponent() {
    return AuthenticationPage;
  }

  restoreUser(user: User) {
    return this.authenticate(user);
  }

  async authenticate(state: Credentials) {
    this.token = state.token as string;
    this.refreshToken = state.refresh_token;
    this.api = new API(
      {
        apiRoot: this.apiRoot,
        apiVersion: this.apiVersion,
        repo: this.repo,
        branch: this.branch,
        squashMerges: this.squashMerges,
        cmsLabelPrefix: this.cmsLabelPrefix,
        initialWorkflowStatus: this.options.initialWorkflowStatus,
        requestFunction: this.apiRequestFunction,
      },
      this.token,
    );

    const user = await this.api.user();
    return { token: state.token as string, refresh_token: state.refresh_token, ...user };
  }

  /**
   * Log the user out by forgetting their access token.
   * TODO: *Actual* logout by redirecting to:
   * https://login.microsoftonline.com/{tenantId}/oauth2/logout?client_id={clientId}&post_logout_redirect_uri={baseUrl}
   */
  logout() {
    this.token = null;
    return;
  }

  getToken() {
    if (this.refreshedTokenPromise) {
      return this.refreshedTokenPromise;
    }

    return Promise.resolve(this.token);
  }

  getRefreshedAccessToken() {
    if (this.authType === 'implicit') {
      throw new AccessTokenError(`Can't refresh access token when using implicit auth`);
    }
    if (this.refreshedTokenPromise) {
      return this.refreshedTokenPromise;
    }

    if (!this.refreshToken) {
      throw new AccessTokenError(`Can't refresh access token without refresh token`);
    }

    const bodyObject: Record<string, string> = {
      client_id: this.appId,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    };
    if (this.authScope) {
      bodyObject.scope = this.authScope;
    }

    this.refreshedTokenPromise = fetch(this.authTokenUrl, {
      method: 'POST',
      body: this.authTokenEndpointContentType.startsWith('application/x-www-form-urlencoded')
        ? new URLSearchParams(Object.entries(bodyObject)).toString()
        : JSON.stringify(bodyObject),
      headers: {
        'Content-Type': this.authTokenEndpointContentType,
      },
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.access_token) {
          const errorMessage = data.error_description || data.error || 'Failed to refresh token';
          throw new Error(errorMessage);
        }
        return data;
      })
      .then(({ access_token: token, refresh_token }) => {
        this.token = token;
        this.refreshToken = refresh_token || this.refreshToken;
        this.updateUserCredentials({ token, refresh_token: this.refreshToken as string });
        return token;
      })
      .finally(() => {
        this.refreshedTokenPromise = undefined;
      });

    return this.refreshedTokenPromise;
  }

  apiRequestFunction = async (req: ApiRequest) => {
    const token = (
      this.refreshedTokenPromise ? await this.refreshedTokenPromise : this.token
    ) as string;
    const authorizedRequest = unsentRequest.withHeaders({ Authorization: `Bearer ${token}` }, req);
    const response = await unsentRequest.performRequest(authorizedRequest);
    if (response.status === 401 && this.refreshToken) {
      const newToken = await this.getRefreshedAccessToken();
      const reqWithNewToken = unsentRequest.withHeaders(
        {
          Authorization: `Bearer ${newToken}`,
        },
        req,
      );
      return unsentRequest.performRequest(reqWithNewToken);
    }
    return response;
  };

  async entriesByFolder(folder: string, extension: string, depth: number) {
    const listFiles = async () => {
      const files = await this.api!.listFiles(folder, depth > 1);
      const filtered = files.filter(file => filterByExtension({ path: file.path }, extension));
      return filtered.map(file => ({
        id: file.id,
        path: file.path,
      }));
    };

    const entries = await entriesByFolder(
      listFiles,
      this.api!.readFile.bind(this.api!),
      this.api!.readFileMetadata.bind(this.api),
      API_NAME,
    );
    return entries;
  }

  entriesByFiles(files: ImplementationFile[]) {
    return entriesByFiles(
      files,
      this.api!.readFile.bind(this.api!),
      this.api!.readFileMetadata.bind(this.api),
      API_NAME,
    );
  }

  async getEntry(path: string) {
    const data = (await this.api!.readFile(path)) as string;
    return {
      file: { path },
      data,
    };
  }

  async getMedia() {
    const files = await this.api!.listFiles(this.mediaFolder, false);
    const mediaFiles = await Promise.all(
      files.map(async ({ id, path, name }) => {
        const blobUrl = await this.getMediaDisplayURL({ id, path });
        return { id, name, displayURL: blobUrl, path };
      }),
    );
    return mediaFiles;
  }

  getMediaDisplayURL(displayURL: DisplayURL) {
    this._mediaDisplayURLSem = this._mediaDisplayURLSem || semaphore(MAX_CONCURRENT_DOWNLOADS);
    return getMediaDisplayURL(
      displayURL,
      this.api!.readFile.bind(this.api!),
      this._mediaDisplayURLSem,
    );
  }

  async getMediaFile(path: string) {
    const name = basename(path);
    const blob = await getMediaAsBlob(path, null, this.api!.readFile.bind(this.api!));
    const fileObj = new File([blob], name);
    const url = URL.createObjectURL(fileObj);
    const id = await getBlobSHA(blob);

    return {
      id,
      displayURL: url,
      path,
      name,
      size: fileObj.size,
      file: fileObj,
      url,
    };
  }

  async persistEntry(entry: Entry, options: PersistOptions): Promise<void> {
    const mediaFiles: AssetProxy[] = entry.assets;
    await this.api!.persistFiles(entry.dataFiles, mediaFiles, options);
  }

  async persistMedia(
    mediaFile: AssetProxy,
    options: PersistOptions,
  ): Promise<ImplementationMediaFile> {
    const fileObj = mediaFile.fileObj as File;

    const [id] = await Promise.all([
      getBlobSHA(fileObj),
      this.api!.persistFiles([], [mediaFile], options),
    ]);

    const { path } = mediaFile;
    const url = URL.createObjectURL(fileObj);

    return {
      displayURL: url,
      path: trimStart(path, '/'),
      name: fileObj!.name,
      size: fileObj!.size,
      file: fileObj,
      url,
      id: id as string,
    };
  }

  async deleteFiles(paths: string[], commitMessage: string) {
    await this.api!.deleteFiles(paths, commitMessage);
  }

  async loadMediaFile(branch: string, file: UnpublishedEntryMediaFile) {
    const readFile = (
      path: string,
      id: string | null | undefined,
      { parseText }: { parseText: boolean },
    ) => this.api!.readFile(path, id, { branch, parseText });

    const blob = await getMediaAsBlob(file.path, null, readFile);
    const name = basename(file.path);
    const fileObj = new File([blob], name);
    return {
      id: file.path,
      displayURL: URL.createObjectURL(fileObj),
      path: file.path,
      name,
      size: fileObj.size,
      file: fileObj,
    };
  }

  async loadEntryMediaFiles(branch: string, files: UnpublishedEntryMediaFile[]) {
    const mediaFiles = await Promise.all(files.map(file => this.loadMediaFile(branch, file)));

    return mediaFiles;
  }

  async unpublishedEntries() {
    const listEntriesKeys = () =>
      this.api!.listUnpublishedBranches().then(branches =>
        branches.map(branch => contentKeyFromBranch(branch)),
      );

    const ids = await unpublishedEntries(listEntriesKeys);
    return ids;
  }

  async unpublishedEntry({
    id,
    collection,
    slug,
  }: {
    id?: string;
    collection?: string;
    slug?: string;
  }) {
    if (id) {
      const data = await this.api!.retrieveUnpublishedEntryData(id);
      return data;
    } else if (collection && slug) {
      const contentKey = generateContentKey(collection, slug);
      const data = await this.api!.retrieveUnpublishedEntryData(contentKey);
      return data;
    } else {
      throw new Error('Missing unpublished entry id or collection and slug');
    }
  }

  getBranch(collection: string, slug: string) {
    const contentKey = generateContentKey(collection, slug);
    const branch = branchFromContentKey(contentKey);
    return branch;
  }

  async unpublishedEntryMediaFile(collection: string, slug: string, path: string, id: string) {
    const branch = this.getBranch(collection, slug);
    const mediaFile = await this.loadMediaFile(branch, { path, id });
    return mediaFile;
  }

  async unpublishedEntryDataFile(collection: string, slug: string, path: string, id: string) {
    const branch = this.getBranch(collection, slug);
    const data = (await this.api!.readFile(path, id, { branch })) as string;
    return data;
  }

  updateUnpublishedEntryStatus(collection: string, slug: string, newStatus: string) {
    // updateUnpublishedEntryStatus is a transactional operation
    return runWithLock(
      this.lock,
      () => this.api!.updateUnpublishedEntryStatus(collection, slug, newStatus),
      'Failed to acquire update entry status lock',
    );
  }

  deleteUnpublishedEntry(collection: string, slug: string) {
    // deleteUnpublishedEntry is a transactional operation
    return runWithLock(
      this.lock,
      () => this.api!.deleteUnpublishedEntry(collection, slug),
      'Failed to acquire delete entry lock',
    );
  }

  publishUnpublishedEntry(collection: string, slug: string) {
    // publishUnpublishedEntry is a transactional operation
    return runWithLock(
      this.lock,
      () => this.api!.publishUnpublishedEntry(collection, slug),
      'Failed to acquire publish entry lock',
    );
  }

  async getDeployPreview(collection: string, slug: string) {
    try {
      const statuses = await this.api!.getStatuses(collection, slug);
      const deployStatus = getPreviewStatus(statuses, this.previewContext);

      if (deployStatus) {
        const { target_url: url, state } = deployStatus;
        return { url, status: state };
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
}
