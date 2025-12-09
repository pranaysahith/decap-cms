import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
// import debounce from 'lodash/debounce';
import { colors, lengths, borders, text } from 'decap-cms-ui-default';

const Container = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background-color: ${colors.foreground};
  border-radius: ${lengths.borderRadius};
  border: ${borders.textField};
`;

const WarningBanner = styled.div`
  padding: 12px 16px;
  margin-bottom: 16px;
  background-color: ${colors.warnBackground};
  color: ${colors.warnText};
  border-radius: ${lengths.borderRadius};
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
`;

const WarningIcon = styled.span`
  margin-right: 8px;
  font-weight: bold;
  font-size: 16px;
`;

const Label = styled.label`
  ${text.fieldLabel};
  display: block;
  margin-bottom: 8px;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: ${lengths.inputPadding};
  border: ${borders.textField};
  border-radius: ${lengths.borderRadius};
  font-size: 15px;
  font-family: inherit;
  background-color: ${colors.inputBackground};

  ${props =>
    props.hasError &&
    css`
      border-color: ${colors.errorText};
    `}

  &:focus {
    outline: none;
    border-color: ${colors.active};
  }

  &:disabled {
    background-color: ${colors.background};
    color: ${colors.inactive};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  margin-top: 8px;
  color: ${colors.errorText};
  font-size: 13px;
`;

const HelpText = styled.div`
  margin-top: 8px;
  color: ${colors.text};
  font-size: 13px;
`;

class EntryPathEditor extends React.Component {
  static propTypes = {
    collection: ImmutablePropTypes.map.isRequired,
    entry: ImmutablePropTypes.map.isRequired,
    onChange: PropTypes.func.isRequired,
    onPendingChange: PropTypes.func,
    onValidate: PropTypes.func,
    disabled: PropTypes.bool,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    disabled: false,
    onValidate: null,
    onPendingChange: null,
  };

  constructor(props) {
    super(props);

    const { entry, collection } = props;
    const entryPath = entry.get('path', '');
    const collectionFolder = collection.get('folder', '');

    // Extract filename from full path
    const pathParts = entryPath.split('/');
    const filename = pathParts.pop() || '';

    // Get folder path relative to collection folder
    const fullFolderPath = pathParts.join('/');
    const folderPath =
      collectionFolder && fullFolderPath.startsWith(collectionFolder + '/')
        ? fullFolderPath.slice(Math.max(0, collectionFolder.length + 1))
        : fullFolderPath;

    this.state = {
      filename,
      originalFilename: filename,
      folderPath, // Store folder path (relative to collection) in state to avoid stale props
      validationError: null,
      hasChanged: false,
      isValidating: false,
    };
  }

  componentDidUpdate(prevProps) {
    // If the meta path changes (user edited the Path field), update our folderPath state
    const prevMetaPath = prevProps.entry.getIn(['meta', 'path'], '');
    const currentMetaPath = this.props.entry.getIn(['meta', 'path'], '');

    if (prevMetaPath !== currentMetaPath) {
      this.setState({ folderPath: currentMetaPath });
    }
  }

  componentWillUnmount() {
    // No debounced validation to cancel anymore
  }

  handleFilenameChange = e => {
    const filename = e.target.value;
    const { originalFilename, folderPath } = this.state;
    const hasChanged = filename !== originalFilename;

    this.setState({
      filename,
      hasChanged,
      validationError: null, // Clear any previous validation errors
    });

    // Notify parent about the pending change so hasChanged state is updated
    if (this.props.onPendingChange) {
      this.props.onPendingChange(hasChanged);
    }

    // Update the entry path immediately so Redux state reflects the change
    // Construct the full path including collection folder
    const { onChange, collection } = this.props;
    const collectionFolder = collection.get('folder', '');
    const relativePath = folderPath ? `${folderPath}/${filename}` : filename;
    const fullPath = collectionFolder ? `${collectionFolder}/${relativePath}` : relativePath;

    // Call onChange to update Redux state immediately
    onChange(fullPath, filename);
  };

  validateAndApply = async () => {
    const { filename, originalFilename } = this.state;
    const { onValidate, t } = this.props; // removed unused `entry`

    // Don't validate if filename hasn't changed
    if (filename === originalFilename) {
      return { valid: true };
    }

    this.setState({ isValidating: true });

    // Basic client-side validation
    let error = null;

    // Check if filename is empty
    if (!filename || filename.trim() === '') {
      error = t('editor.entryPathEditor.errors.filenameRequired', {
        defaultValue: 'Filename is required',
      });
    }
    // Check for invalid characters (basic check)
    else if (/[<>:"|?*]/.test(filename)) {
      error = t('editor.entryPathEditor.errors.invalidCharacters', {
        defaultValue: 'Filename contains invalid characters: < > : " | ? *',
      });
    }
    // Check for path traversal attempts
    else if (filename.includes('..')) {
      error = t('editor.entryPathEditor.errors.pathTraversal', {
        defaultValue: 'Filename cannot contain ".."',
      });
    }
    // Check for forward slashes (filename should not contain path separators)
    else if (filename.includes('/') || filename.includes('\\')) {
      error = t('editor.entryPathEditor.errors.noPathSeparators', {
        defaultValue: 'Filename cannot contain path separators (/ or \\)',
      });
    }

    // If there's a validation function provided, call it
    if (!error && onValidate) {
      try {
        // Use folder path from state to avoid stale props
        // Construct the full path including collection folder
        const { folderPath } = this.state;
        const { collection } = this.props;
        const collectionFolder = collection.get('folder', '');
        const relativePath = folderPath ? `${folderPath}/${filename}` : filename;
        const fullPath = collectionFolder ? `${collectionFolder}/${relativePath}` : relativePath;

        const validationResult = await onValidate(fullPath, filename);
        if (validationResult && validationResult.error) {
          error = validationResult.error;
        }
      } catch (err) {
        error =
          err.message ||
          t('editor.entryPathEditor.errors.validationFailed', {
            defaultValue: 'Validation failed',
          });
      }
    }

    this.setState({ validationError: error, isValidating: false });

    // If validation passed, update the baseline
    if (!error) {
      // Update originalFilename so we know the new baseline
      // Note: We don't call onChange here because it's already been called in handleFilenameChange
      this.setState({ originalFilename: filename, hasChanged: false });

      return { valid: true };
    }

    return { valid: false, error };
  };

  hasValidationError = () => {
    return !!this.state.validationError;
  };

  render() {
    const { disabled, t } = this.props;
    const { filename, validationError, hasChanged, isValidating } = this.state;

    return (
      <Container>
        {hasChanged && (
          <WarningBanner>
            <WarningIcon>⚠</WarningIcon>
            <div>
              {t('editor.entryPathEditor.urlWarning', {
                defaultValue:
                  'Changing the filename will change the URL for this entry. This may result in broken links and 404 errors if the old URL is referenced elsewhere. The change will be applied when you publish.',
              })}
            </div>
          </WarningBanner>
        )}

        <InputGroup>
          <Label htmlFor="entry-filename">
            {t('editor.entryPathEditor.filename', { defaultValue: 'Filename' })}
          </Label>
          <Input
            id="entry-filename"
            type="text"
            value={filename}
            onChange={this.handleFilenameChange}
            disabled={disabled || isValidating}
            hasError={!!validationError}
            placeholder={t('editor.entryPathEditor.filenamePlaceholder', {
              defaultValue: 'e.g., my-post.md',
            })}
          />
          {validationError && <ErrorMessage>{validationError}</ErrorMessage>}
          {isValidating && (
            <HelpText>
              {t('editor.entryPathEditor.validating', {
                defaultValue: 'Validating...',
              })}
            </HelpText>
          )}
          {!isValidating && !validationError && !hasChanged && (
            <HelpText>
              {t('editor.entryPathEditor.filenameHelp', {
                defaultValue: 'The filename for this entry (including extension)',
              })}
            </HelpText>
          )}
        </InputGroup>
      </Container>
    );
  }
}

export default EntryPathEditor;
