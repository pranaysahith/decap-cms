import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import debounce from 'lodash/debounce';
import { colors, lengths, borders, text } from 'decap-cms-ui-default';

const RenameContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
`;

const RenameButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${colors.text};
  font-size: 16px;
  border-radius: ${lengths.borderRadius};
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;

  &:hover {
    background-color: ${colors.activeBackground};
    color: ${colors.active};
  }

  &:focus {
    outline: 2px solid ${colors.active};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RenameModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: ${colors.foreground};
  border-radius: ${lengths.borderRadius};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
  z-index: 1000;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const ModalHeader = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.text};
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
  flex-shrink: 0;
`;

const Label = styled.label`
  ${text.fieldLabel};
  display: block;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: ${lengths.inputPadding};
  border: ${borders.textField};
  border-radius: ${lengths.borderRadius};
  font-size: 15px;
  font-family: inherit;
  background-color: ${colors.inputBackground};
  margin-bottom: 8px;

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
  margin-bottom: 16px;
  color: ${colors.errorText};
  font-size: 13px;
`;

const HelpText = styled.div`
  margin-bottom: 16px;
  color: ${colors.text};
  font-size: 13px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: ${lengths.borderRadius};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:focus {
    outline: 2px solid ${colors.active};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: ${colors.background};
  color: ${colors.text};
  border-color: ${colors.border};

  &:hover:not(:disabled) {
    background-color: ${colors.activeBackground};
  }
`;

const ConfirmButton = styled(Button)`
  background-color: ${colors.active};
  color: white;

  &:hover:not(:disabled) {
    background-color: ${colors.activeHover || colors.active};
    opacity: 0.9;
  }
`;

const ProgressIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.text};
  font-size: 14px;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${colors.border};
  border-top-color: ${colors.active};
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

class FolderRenameControl extends React.Component {
  static propTypes = {
    collection: ImmutablePropTypes.map.isRequired,
    folderPath: PropTypes.string.isRequired,
    folderName: PropTypes.string.isRequired,
    affectedEntryCount: PropTypes.number,
    onRename: PropTypes.func.isRequired,
    onValidate: PropTypes.func,
    disabled: PropTypes.bool,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    disabled: false,
    onValidate: null,
    affectedEntryCount: 0,
  };

  constructor(props) {
    super(props);

    this.state = {
      isEditing: false,
      newName: props.folderName,
      validationError: null,
      isValidating: false,
      isRenaming: false,
    };

    // Debounce validation to avoid excessive calls
    this.debouncedValidate = debounce(this.validateFolderName, 500);
  }

  componentDidMount() {
    // Store the previously focused element to restore focus when modal closes
    this.previouslyFocusedElement = null;
  }

  componentDidUpdate(prevProps, prevState) {
    // When modal opens, store the previously focused element
    if (this.state.isEditing && !prevState.isEditing) {
      this.previouslyFocusedElement = document.activeElement;
    }
    // When modal closes, restore focus to the previously focused element
    if (!this.state.isEditing && prevState.isEditing) {
      if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
        this.previouslyFocusedElement.focus();
      }
    }
  }

  componentWillUnmount() {
    // Cancel any pending validation
    this.debouncedValidate.cancel();
  }

  handleRenameClick = () => {
    this.setState({ isEditing: true, newName: this.props.folderName });
  };

  handleCancel = () => {
    this.setState({
      isEditing: false,
      newName: this.props.folderName,
      validationError: null,
      isValidating: false,
    });
    this.debouncedValidate.cancel();
  };

  handleInputChange = e => {
    const newName = e.target.value;
    this.setState({ newName, isValidating: true }, () => {
      this.debouncedValidate();
    });
  };

  handleKeyDown = e => {
    if (e.key === 'Enter' && !this.state.validationError && !this.state.isValidating) {
      this.handleConfirm();
    } else if (e.key === 'Escape') {
      this.handleCancel();
    } else if (e.key === 'Tab') {
      // Simple focus trap: keep focus within the modal
      this.handleTabKey(e);
    }
  };

  handleTabKey = e => {
    if (!this.modalRef) return;

    const focusableElements = this.modalRef.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  setModalRef = ref => {
    this.modalRef = ref;
  };

  validateFolderName = async () => {
    const { newName } = this.state;
    const { folderName, onValidate, t } = this.props;

    // Don't validate if name hasn't changed
    if (newName === folderName) {
      this.setState({ validationError: null, isValidating: false });
      return;
    }

    // Basic client-side validation
    let error = null;

    // Check if folder name is empty
    if (!newName || newName.trim() === '') {
      error = t('collection.folderRename.errors.nameRequired', {
        defaultValue: 'Folder name is required',
      });
    }
    // Check for invalid characters
    else if (/[<>:"|?*/\\]/.test(newName)) {
      error = t('collection.folderRename.errors.invalidCharacters', {
        defaultValue: 'Folder name contains invalid characters: < > : " | ? * / \\',
      });
    }
    // Check for path traversal attempts
    else if (newName.includes('..')) {
      error = t('collection.folderRename.errors.pathTraversal', {
        defaultValue: 'Folder name cannot contain ".."',
      });
    }

    // If there's a validation function provided, call it
    if (!error && onValidate) {
      try {
        const validationResult = await onValidate(newName);
        if (validationResult && validationResult.error) {
          error = validationResult.error;
        }
      } catch (err) {
        error =
          err.message ||
          t('collection.folderRename.errors.validationFailed', {
            defaultValue: 'Validation failed',
          });
      }
    }

    this.setState({ validationError: error, isValidating: false });
  };

  handleConfirm = async () => {
    const { newName, validationError, isValidating } = this.state;
    const { folderPath, folderName, onRename, t } = this.props;

    // Don't proceed if there are validation errors or validation is in progress
    if (validationError || isValidating) {
      return;
    }

    // Don't proceed if name hasn't changed
    if (newName === folderName) {
      this.handleCancel();
      return;
    }

    this.setState({ isRenaming: true });

    try {
      // Construct the new path
      const pathParts = folderPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');

      await onRename(folderPath, newPath);

      // Success - close the modal
      this.setState({
        isEditing: false,
        isRenaming: false,
        newName: folderName,
        validationError: null,
      });
    } catch (err) {
      // Handle error
      const errorMessage =
        err.message ||
        t('collection.folderRename.errors.renameFailed', {
          defaultValue: 'Failed to rename folder',
        });

      this.setState({
        validationError: errorMessage,
        isRenaming: false,
      });
    }
  };

  render() {
    const { disabled, affectedEntryCount, t } = this.props;
    const { isEditing, newName, validationError, isValidating, isRenaming } = this.state;

    const hasError = !!validationError;
    const canConfirm = !hasError && !isValidating && !isRenaming && newName.trim() !== '';

    return (
      <>
        <RenameContainer>
          <RenameButton
            onClick={this.handleRenameClick}
            disabled={disabled}
            aria-label={t('collection.folderRename.renameButton', {
              defaultValue: 'Rename folder',
            })}
            title={t('collection.folderRename.renameButton', {
              defaultValue: 'Rename folder',
            })}
          >
            ✏️
          </RenameButton>
        </RenameContainer>

        {isEditing && (
          <>
            <Overlay onClick={this.handleCancel} aria-hidden="true" />
            <RenameModal
              ref={this.setModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-modal-title"
            >
              <ModalHeader id="rename-modal-title">
                {t('collection.folderRename.title', { defaultValue: 'Rename Folder' })}
              </ModalHeader>

              <WarningBanner>
                <WarningIcon aria-hidden="true">⚠</WarningIcon>
                <div>
                  {t('collection.folderRename.urlWarning', {
                    defaultValue:
                      'Renaming this folder will change the URLs for all entries within it. This may result in broken links and 404 errors if the old URLs are referenced elsewhere.',
                  })}
                  {affectedEntryCount > 0 && (
                    <>
                      {' '}
                      {t('collection.folderRename.affectedEntries', {
                        defaultValue: `This will affect ${affectedEntryCount} ${
                          affectedEntryCount === 1 ? 'entry' : 'entries'
                        }.`,
                        count: affectedEntryCount,
                      })}
                    </>
                  )}
                </div>
              </WarningBanner>

              <Label htmlFor="folder-rename-input">
                {t('collection.folderRename.newName', { defaultValue: 'New Folder Name' })}
              </Label>
              <Input
                id="folder-rename-input"
                type="text"
                value={newName}
                onChange={this.handleInputChange}
                onKeyDown={this.handleKeyDown}
                disabled={isRenaming}
                hasError={hasError}
                autoFocus
                aria-invalid={hasError}
                aria-describedby={
                  hasError ? 'folder-rename-error' : isValidating ? 'folder-rename-validating' : ''
                }
              />

              {hasError && (
                <ErrorMessage id="folder-rename-error" role="alert">
                  {validationError}
                </ErrorMessage>
              )}

              {isValidating && !hasError && (
                <HelpText id="folder-rename-validating">
                  {t('collection.folderRename.validating', {
                    defaultValue: 'Validating...',
                  })}
                </HelpText>
              )}

              {isRenaming && (
                <ProgressIndicator>
                  <Spinner aria-hidden="true" />
                  <span>
                    {t('collection.folderRename.renaming', {
                      defaultValue: 'Renaming folder...',
                    })}
                  </span>
                </ProgressIndicator>
              )}

              <ButtonGroup>
                <CancelButton onClick={this.handleCancel} disabled={isRenaming}>
                  {t('collection.folderRename.cancel', { defaultValue: 'Cancel' })}
                </CancelButton>
                <ConfirmButton onClick={this.handleConfirm} disabled={!canConfirm}>
                  {t('collection.folderRename.confirm', { defaultValue: 'Rename' })}
                </ConfirmButton>
              </ButtonGroup>
            </RenameModal>
          </>
        )}
      </>
    );
  }
}

export default FolderRenameControl;
