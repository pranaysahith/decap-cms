import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import debounce from 'lodash/debounce';
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
    onValidate: PropTypes.func,
    disabled: PropTypes.bool,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    disabled: false,
    onValidate: null,
  };

  constructor(props) {
    super(props);

    const { entry } = props;
    const entryPath = entry.get('path', '');
    const pathParts = entryPath.split('/');
    const filename = pathParts.pop() || '';
    const folderPath = pathParts.join('/');

    this.state = {
      folderPath,
      filename,
      validationError: null,
      hasChanged: false,
      isValidating: false,
    };

    // Debounce validation to avoid excessive calls
    this.debouncedValidate = debounce(this.validatePath, 500);
  }

  componentWillUnmount() {
    // Cancel any pending validation
    this.debouncedValidate.cancel();
  }

  handleFolderPathChange = e => {
    const folderPath = e.target.value;
    this.setState({ folderPath, hasChanged: true, isValidating: true }, () => {
      this.notifyChange();
      this.debouncedValidate();
    });
  };

  handleFilenameChange = e => {
    const filename = e.target.value;
    this.setState({ filename, hasChanged: true, isValidating: true }, () => {
      this.notifyChange();
      this.debouncedValidate();
    });
  };

  notifyChange = () => {
    const { folderPath, filename } = this.state;
    const { onChange } = this.props;

    const newPath = folderPath ? `${folderPath}/${filename}` : filename;
    onChange(newPath, filename);
  };

  validatePath = async () => {
    const { folderPath, filename } = this.state;
    const { onValidate, t } = this.props;

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
    else if (filename.includes('..') || folderPath.includes('..')) {
      error = t('editor.entryPathEditor.errors.pathTraversal', {
        defaultValue: 'Path cannot contain ".."',
      });
    }

    // If there's a validation function provided, call it
    if (!error && onValidate) {
      try {
        const newPath = folderPath ? `${folderPath}/${filename}` : filename;
        const validationResult = await onValidate(newPath, filename);
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
  };

  hasValidationError = () => {
    return !!this.state.validationError;
  };

  render() {
    const { disabled, t } = this.props;
    const { folderPath, filename, validationError, hasChanged, isValidating } = this.state;

    return (
      <Container>
        {hasChanged && (
          <WarningBanner>
            <WarningIcon>⚠</WarningIcon>
            <div>
              {t('editor.entryPathEditor.urlWarning', {
                defaultValue:
                  'Changing the file or folder name will change the URL for this entry. This may result in broken links and 404 errors if the old URL is referenced elsewhere.',
              })}
            </div>
          </WarningBanner>
        )}

        <InputGroup>
          <Label htmlFor="entry-folder-path">
            {t('editor.entryPathEditor.folderPath', { defaultValue: 'Folder Path' })}
          </Label>
          <Input
            id="entry-folder-path"
            type="text"
            value={folderPath}
            onChange={this.handleFolderPathChange}
            disabled={disabled || isValidating}
            placeholder={t('editor.entryPathEditor.folderPathPlaceholder', {
              defaultValue: 'e.g., blog/2024',
            })}
          />
          <HelpText>
            {t('editor.entryPathEditor.folderPathHelp', {
              defaultValue: 'The folder path where this entry will be stored',
            })}
          </HelpText>
        </InputGroup>

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
          {isValidating && !validationError && (
            <HelpText>
              {t('editor.entryPathEditor.validating', {
                defaultValue: 'Validating...',
              })}
            </HelpText>
          )}
          {!isValidating && !validationError && (
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
