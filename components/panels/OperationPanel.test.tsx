import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperationPanel } from '@/components/panels/OperationPanel';
import type { AlgorithmHandle, OperationHandle, StructureHandle } from '@/lib/registry/types';

// Minimal structure handles — only the fields OperationPanel is allowed to touch (id, name,
// slug) are populated. The rest are never called by this presentational component.
function fakeStructure(overrides: Partial<StructureHandle>): StructureHandle {
  return {
    id: 'fake',
    name: 'Fake',
    slug: 'fake',
    category: 'linear',
    summary: '',
    complexity: { rows: [], space: '' },
    operations: [],
    algorithms: [],
    create: () => ({}),
    seed: () => ({}),
    clone: (s) => s,
    scene: () => ({ kind: 'linear', cells: [], pointers: [] }),
    runOperation: () => {
      throw new Error('not implemented in test double');
    },
    runAlgorithm: () => {
      throw new Error('not implemented in test double');
    },
    validateOperation: () => null,
    ...overrides,
  };
}

describe('OperationPanel', () => {
  it('renders the structure dropdown from the registry and reports selection changes', async () => {
    const user = userEvent.setup();
    const onSelectStructure = vi.fn();
    const structures = [
      fakeStructure({ id: 'array', slug: 'array', name: 'Array' }),
      fakeStructure({ id: 'stack', slug: 'stack', name: 'Stack' }),
    ];

    render(
      <OperationPanel
        structures={structures}
        selectedSlug="array"
        onSelectStructure={onSelectStructure}
        operations={[]}
        onRunOperation={vi.fn()}
        algorithms={[]}
        onRunAlgorithm={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Structure');
    expect(select).toHaveValue('array');
    expect(screen.getByRole('option', { name: 'Array' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Stack' })).toBeInTheDocument();

    await user.selectOptions(select, 'stack');
    expect(onSelectStructure).toHaveBeenCalledWith('stack');
  });

  it('renders a labelled input per declared OperationField, typed by field.type, and submits typed args', async () => {
    const user = userEvent.setup();
    const onRunOperation = vi.fn();

    // A structure never seen by this component before, with three string fields — proves
    // OperationPanel derives its form purely from the registry shape, not hardcoded knowledge.
    const operations: OperationHandle[] = [
      {
        id: 'connect',
        name: 'Connect',
        fields: [
          { name: 'from', label: 'From', type: 'string', placeholder: 'A' },
          { name: 'to', label: 'To', type: 'string', placeholder: 'B' },
          { name: 'label', label: 'Label', type: 'string', placeholder: 'edge label' },
        ],
      },
    ];

    render(
      <OperationPanel
        structures={[]}
        selectedSlug="graph"
        onSelectStructure={vi.fn()}
        operations={operations}
        onRunOperation={onRunOperation}
        algorithms={[]}
        onRunAlgorithm={vi.fn()}
      />,
    );

    const fromInput = screen.getByLabelText('Connect From');
    const toInput = screen.getByLabelText('Connect To');
    const labelInput = screen.getByLabelText('Connect Label');

    await user.type(fromInput, 'X');
    await user.type(toInput, 'Y');
    await user.type(labelInput, 'weighted');

    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(onRunOperation).toHaveBeenCalledWith('connect', { from: 'X', to: 'Y', label: 'weighted' });
  });

  it('coerces number-typed fields and passes null for fields left empty', async () => {
    const user = userEvent.setup();
    const onRunOperation = vi.fn();

    const operations: OperationHandle[] = [
      {
        id: 'insertAt',
        name: 'Insert at',
        fields: [
          { name: 'index', label: 'Index', type: 'number' },
          { name: 'note', label: 'Note', type: 'string', required: false },
        ],
      },
    ];

    render(
      <OperationPanel
        structures={[]}
        selectedSlug="array"
        onSelectStructure={vi.fn()}
        operations={operations}
        onRunOperation={onRunOperation}
        algorithms={[]}
        onRunAlgorithm={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Insert at Index'), '3');
    // "Note" is left empty on purpose.
    await user.click(screen.getByRole('button', { name: 'Insert at' }));

    expect(onRunOperation).toHaveBeenCalledWith('insertAt', { index: 3, note: null });
  });

  it('renders an operation with no fields as just a button', () => {
    const operations: OperationHandle[] = [{ id: 'pop', name: 'Pop', fields: [] }];

    render(
      <OperationPanel
        structures={[]}
        selectedSlug="stack"
        onSelectStructure={vi.fn()}
        operations={operations}
        onRunOperation={vi.fn()}
        algorithms={[]}
        onRunAlgorithm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pop' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders one prefixed button per algorithm and calls onRunAlgorithm', async () => {
    const user = userEvent.setup();
    const onRunAlgorithm = vi.fn();
    const algorithms: AlgorithmHandle[] = [
      { id: 'bubble-sort', name: 'Bubble Sort', pseudocode: [] },
      { id: 'linear-search', name: 'Linear Search', pseudocode: [] },
    ];

    render(
      <OperationPanel
        structures={[]}
        selectedSlug="array"
        onSelectStructure={vi.fn()}
        operations={[]}
        onRunOperation={vi.fn()}
        algorithms={algorithms}
        onRunAlgorithm={onRunAlgorithm}
      />,
    );

    const button = screen.getByRole('button', { name: /Bubble Sort/ });
    expect(button).toHaveTextContent('▸');

    await user.click(button);
    expect(onRunAlgorithm).toHaveBeenCalledWith('bubble-sort');
  });

  it('shows the error as an alert beneath the ops section and clears it when a field is edited', async () => {
    const user = userEvent.setup();
    const operations: OperationHandle[] = [
      { id: 'push', name: 'Push', fields: [{ name: 'value', label: 'Value', type: 'number' }] },
    ];

    render(
      <OperationPanel
        structures={[]}
        selectedSlug="array"
        onSelectStructure={vi.fn()}
        operations={operations}
        onRunOperation={vi.fn()}
        algorithms={[]}
        onRunAlgorithm={vi.fn()}
        error="Array is full — 60 values maximum."
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Array is full — 60 values maximum.');

    await user.type(screen.getByLabelText('Push Value'), '1');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables inputs and buttons while disabled', () => {
    const operations: OperationHandle[] = [
      { id: 'push', name: 'Push', fields: [{ name: 'value', label: 'Value', type: 'number' }] },
    ];
    const algorithms: AlgorithmHandle[] = [{ id: 'bubble-sort', name: 'Bubble Sort', pseudocode: [] }];

    render(
      <OperationPanel
        structures={[fakeStructure({ slug: 'array', name: 'Array' })]}
        selectedSlug="array"
        onSelectStructure={vi.fn()}
        operations={operations}
        onRunOperation={vi.fn()}
        algorithms={algorithms}
        onRunAlgorithm={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText('Push Value')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Push' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Bubble Sort/ })).toBeDisabled();
    expect(screen.getByLabelText('Structure')).toBeDisabled();
  });
});
