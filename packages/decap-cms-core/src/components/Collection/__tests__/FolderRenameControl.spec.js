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

  const defaultProps = {
    collection,
    folderPath: '/blog',
    folderName: 'blog',
    affectedEntryCount: 5,
    onRename: jest.fn(),
    onValidate: jest.fn(),
    disabled: false,
    t: (key, options) => options?.defaultValue || key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render rename button', () => {
    const { getByText } = render(<FolderRenameControl {...defaultProps} />);
    expect(getByText('Rename')).toBeInTheDocument();
  });

  it('should open modal when rename button is clicked', () => {
    const { getByText, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByText('Rename'));

    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('Rename Folder')).toBeInTheDocument();
  });

  it('should display warning banner with affected entry count', () => {
    const { getByText } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByText('Rename'));

    expect(
      getByText(/Renaming this folder will change the URLs for all entries within it/i),
    ).toBeInTheDocument();
    expect(getByText(/This will affect 5 entries/i)).toBeInTheDocument();
  });

  it('should close modal when cancel button is clicked', () => {
    const { getByText, queryByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByText('Rename'));
    expect(queryByRole('dialog')).toBeInTheDocument();

    fireEvent.click(getByText('Cancel'));
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close modal when escape key is pressed', () => {
    const { getByText, queryByRole, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByText('Rename'));
    expect(queryByRole('dialog')).toBeInTheDocument();

    const input = getByRole('dialog').querySelector('input');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should validate folder name on input change', async () => {
    const onValidate = jest.fn().mockResolvedValue({ error: null });
    const { getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onValidate={onValidate} />,
    );

    fireEvent.click(getByText('Rename'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'new-blog' } });

    await waitFor(() => {
      expect(onValidate).toHaveBeenCalledWith('new-blog');
    });
  });

  it('should display validation error', async () => {
    const onValidate = jest.fn().mockResolvedValue({ error: 'Folder already exists' });
    const { getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onValidate={onValidate} />,
    );

    fireEvent.click(getByText('Rename'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'existing-folder' } });

    await waitFor(() => {
      expect(getByText('Folder already exists')).toBeInTheDocument();
    });
  });

  it('should call onRename when confirm button is clicked', async () => {
    const onRename = jest.fn().mockResolvedValue();
    const { getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onRename={onRename} />,
    );

    fireEvent.click(getByText('Rename'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'new-blog' } });

    await waitFor(() => {
      const confirmButton = getByText('Rename', { selector: 'button' });
      expect(confirmButton).not.toBeDisabled();
    });

    const confirmButton = getByText('Rename', { selector: 'button' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith('/blog', '/new-blog');
    });
  });

  it('should disable confirm button when validation error exists', async () => {
    const onValidate = jest.fn().mockResolvedValue({ error: 'Invalid name' });
    const { getByText, getByRole } = render(
      <FolderRenameControl {...defaultProps} onValidate={onValidate} />,
    );

    fireEvent.click(getByText('Rename'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'invalid' } });

    await waitFor(() => {
      const confirmButton = getByText('Rename', { selector: 'button' });
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should validate for empty folder name', async () => {
    const { getByText, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByText('Rename'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(getByText('Folder name is required')).toBeInTheDocument();
    });
  });

  it('should validate for invalid characters', async () => {
    const { getByText, getByRole } = render(<FolderRenameControl {...defaultProps} />);

    fireEvent.click(getByText('Rename'));

    const input = getByRole('dialog').querySelector('input');
    fireEvent.change(input, { target: { value: 'folder/name' } });

    await waitFor(() => {
      expect(getByText(/Folder name contains invalid characters/i)).toBeInTheDocument();
    });
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByText } = render(<FolderRenameControl {...defaultProps} disabled={true} />);

    const button = getByText('Rename');
    expect(button).toBeDisabled();
  });
});
