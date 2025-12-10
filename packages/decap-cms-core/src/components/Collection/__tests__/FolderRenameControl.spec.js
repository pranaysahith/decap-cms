import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { fromJS } from 'immutable';

import FolderRenameControl from '../FolderRenameControl';

describe('FolderRenameControl', () => {
  const collection = fromJS({
    name: 'pages',
    label: 'Pages',
    folder: 'src/pages',
    fields: [{ name: 'title', widget: 'string' }],
    nested: {
      subfolders: false,
    },
  });

  function t(key, options) {
    return options?.defaultValue || key;
  }

  const defaultProps = {
    collection,
    folderPath: '/blog',
    folderName: 'blog',
    affectedEntryCount: 5,
    onRename: jest.fn(),
    onValidate: jest.fn(),
    disabled: false,
    t,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render rename button', () => {
    const { getByLabelText } = render(<FolderRenameControl {...defaultProps} />);
    expect(getByLabelText('Rename folder')).toBeInTheDocument();
  });

  it('should open modal when rename button is clicked', () => {
    const { getByLabelText, getByRole, getByText } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByLabelText('Rename folder'));

    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('Rename Folder')).toBeInTheDocument();
  });

  it('should display warning banner with affected entry count', () => {
    const { getByLabelText, getByText } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByLabelText('Rename folder'));

    expect(
      getByText(/Renaming this folder will change the URLs for all entries within it/i),
    ).toBeInTheDocument();
    expect(getByText(/This will affect 5 entries/i)).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    const { getByLabelText, getByText, queryByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByLabelText('Rename folder'));
    expect(queryByRole('dialog')).toBeInTheDocument();

    fireEvent.click(getByText('Cancel'));
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close modal when escape key is pressed', () => {
    const { getByLabelText, queryByRole, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByLabelText('Rename folder'));
    expect(queryByRole('dialog')).toBeInTheDocument();

    const input = getByRole('dialog').querySelector('input');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should validate folder name on input change', async () => {
    const onValidate = jest.fn().mockResolvedValue({ error: null });
    const { getByLabelText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onValidate={onValidate} />,
    );

    fireEvent.click(getByLabelText('Rename folder'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'new-blog' } });

    await waitFor(() => {
      expect(onValidate).toHaveBeenCalledWith('new-blog');
    });
  });

  it('should display validation error', async () => {
    const onValidate = jest.fn().mockResolvedValue({ error: 'Folder already exists' });
    const { getByLabelText, getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onValidate={onValidate} />,
    );

    fireEvent.click(getByLabelText('Rename folder'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'existing-folder' } });

    await waitFor(() => {
      expect(getByText('Folder already exists')).toBeInTheDocument();
    });
  });

  it('should call onRename when confirm button is clicked', async () => {
    const onRename = jest.fn().mockResolvedValue();
    const { getByLabelText, getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onRename={onRename} />,
    );

    // Click the trigger button
    fireEvent.click(getByLabelText('Rename folder'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'new-blog' } });

    await waitFor(() => {
      // Get the confirm button inside the modal
      const confirmButton = getByText('Rename');
      expect(confirmButton).not.toBeDisabled();
    });

    // Click the confirm button
    const confirmButton = getByText('Rename');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith('/blog', '/new-blog');
    });
  });

  it('should disable confirm button when validation error exists', async () => {
    const onValidate = jest.fn().mockResolvedValue({ error: 'Invalid name' });
    const { getByLabelText, getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onValidate={onValidate} />,
    );

    // Click the trigger button
    fireEvent.click(getByLabelText('Rename folder'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'invalid' } });

    await waitFor(() => {
      // Get the confirm button inside the modal
      const confirmButton = getByText('Rename');
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should validate for empty folder name', async () => {
    const { getByLabelText, getByText, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByLabelText('Rename folder'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(getByText('Folder name is required')).toBeInTheDocument();
    });
  });

  it('should validate for invalid characters', async () => {
    const { getByLabelText, getByText, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByLabelText('Rename folder'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'folder/name' } });

    await waitFor(() => {
      expect(getByText(/Folder name contains invalid characters/i)).toBeInTheDocument();
    });
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByLabelText } = render(<FolderRenameControl {...defaultProps} disabled={true} />);

    const button = getByLabelText('Rename folder');
    expect(button).toBeDisabled();
  });
});
