import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { PkceAuthenticator, ImplicitAuthenticator } from 'decap-cms-lib-auth';
import { AuthenticationPage, Icon } from 'decap-cms-ui-default';

const LoginButtonIcon = styled(Icon)`
  margin-right: 18px;
`;

export default class AzureAuthenticationPage extends React.Component {
  static propTypes = {
    onLogin: PropTypes.func.isRequired,
    inProgress: PropTypes.bool,
    base_url: PropTypes.string,
    siteId: PropTypes.string,
    authEndpoint: PropTypes.string,
    config: PropTypes.object.isRequired,
    clearHash: PropTypes.func,
    t: PropTypes.func.isRequired,
  };

  state = {};

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(
      AzureAuthenticationPage.propTypes,
      this.props,
      'prop',
      'AzureAuthenticationPage',
    );

    const {
      auth_type: authType = 'implicit',
      tenant_id: tenantId = '',
      base_url: baseUrl = `https://login.microsoftonline.com/${tenantId}`,
      app_id: appId = '',
      auth_scope: authScope = '',
    } = this.props.config.backend;

    if (authType === 'implicit') {
      this.auth = new ImplicitAuthenticator({
        base_url: baseUrl,
        auth_endpoint: 'oauth2/authorize',
        app_id: appId,
        clearHash: this.props.clearHash,
      });

      // Complete implicit authentication if we were redirected back to from the provider.
      this.auth.completeAuth((err, data) => {
        if (err) {
          this.setState({ loginError: err.toString() });
          return;
        }
        this.props.onLogin(data);
      });
      this.authSettings = {
        scope: 'vso.code_full,user.read',
        resource: '499b84ac-1321-427f-aa17-267ca6975798',
        prompt: 'select_account',
      };
    } else if (authType === 'pkce') {
      this.auth = new PkceAuthenticator({
        base_url: baseUrl,
        auth_endpoint: this.props.config.backend.auth_endpoint || 'oauth2/v2.0/authorize',
        auth_token_endpoint: this.props.config.backend.auth_token_endpoint || 'oauth2/v2.0/token',
        auth_token_endpoint_content_type:
          this.props.config.backend.auth_token_endpoint_content_type ||
          'application/x-www-form-urlencoded; charset=utf-8',
        app_id: appId,
      });

      this.auth.completeAuth((err, data) => {
        if (err) {
          this.setState({ loginError: err.toString() });
          return;
        }
        this.props.onLogin(data);
      });

      this.authSettings = {
        scope:
          authScope ||
          '499b84ac-1321-427f-aa17-267ca6975798/user_impersonation offline_access openid profile',
      };
    } else {
      this.setState({
        loginError: `Unsupported auth_type "${authType}". Use "implicit" or "pkce".`,
      });
    }
  }

  handleLogin = e => {
    e.preventDefault();
    if (!this.auth) {
      return;
    }
    this.auth.authenticate(this.authSettings, (err, data) => {
      if (err) {
        this.setState({ loginError: err.toString() });
        return;
      }
      this.props.onLogin(data);
    });
  };

  render() {
    const { inProgress, config, t } = this.props;

    return (
      <AuthenticationPage
        onLogin={this.handleLogin}
        loginDisabled={inProgress}
        loginErrorMessage={this.state.loginError}
        logoUrl={config.logo_url} // Deprecated, replaced by `logo.src`
        logo={config.logo}
        renderButtonContent={() => (
          <React.Fragment>
            <LoginButtonIcon type="azure" />
            {inProgress ? t('auth.loggingIn') : t('auth.loginWithAzure')}
          </React.Fragment>
        )}
        t={t}
      />
    );
  }
}
