import React from 'react';
import { fromJS } from 'immutable';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import EntryPathEditor from '../EntryPathEditor';

// Mock translation function
function mockT(key, options) {
  return options?.defaultValue || key;
}

describe('EntryPathEditor', () => {
  const mockCollection = fromJS({
    name: 'posts',
    nested: {
      subfolders: false,
    },
  });

  const mockEntry = fromJS({
    path: 'blog/2024/my-post.md',
    slug: 'my-post',
  });

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render folder path and filename inputs', () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        t={mockT}
      />,
    );

    expect(screen.getByLabelText(/Folder Path/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filename/i)).toBeInTheDocument();
  });

  it('should initialize with correct path values', () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        t={mockT}
      />,
    );

    const folderPathInput = screen.getByLabelText(/Folder Path/i);
    const filenameInput = screen.getByLabelText(/Filename/i);

    expect(folderPathInput).toHaveValue('blog/2024');
    expect(filenameInput).toHaveValue('my-post.md');
  });

  it('should show warning banner when path is changed', async () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        t={mockT}
      />,
    );

    const filenameInput = screen.getByLabelText(/Filename/i);

    // Initially no warning
    expect(screen.queryByText(/URL/i)).not.toBeInTheDocument();

    // Change filename
    fireEvent.change(filenameInput, { target: { value: 'new-post.md' } });

    // Warning should appear
    await waitFor(() => {
      expect(screen.getByText(/URL/i)).toBeInTheDocument();
    });
  });

  it('should call onChange when path is modified', () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        t={mockT}
      />,
    );

    const filenameInput = screen.getByLabelText(/Filename/i);
    fireEvent.change(filenameInput, { target: { value: 'new-post.md' } });

    expect(mockOnChange).toHaveBeenCalledWith('blog/2024/new-post.md', 'new-post.md');
  });

  it('should validate empty filename', async () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        t={mockT}
      />,
    );

    const filenameInput = screen.getByLabelText(/Filename/i);
    fireEvent.change(filenameInput, { target: { value: '' } });

    await waitFor(
      () => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('should validate invalid characters', async () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        t={mockT}
      />,
    );

    const filenameInput = screen.getByLabelText(/Filename/i);
    fireEvent.change(filenameInput, { target: { value: 'invalid<file>.md' } });

    await waitFor(
      () => {
        expect(screen.getByText(/invalid characters/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <EntryPathEditor
        collection={mockCollection}
        entry={mockEntry}
        onChange={mockOnChange}
        disabled={true}
        t={mockT}
      />,
    );

    const folderPathInput = screen.getByLabelText(/Folder Path/i);
    const filenameInput = screen.getByLabelText(/Filename/i);

    expect(folderPathInput).toBeDisabled();
    expect(filenameInput).toBeDisabled();
  });
});
