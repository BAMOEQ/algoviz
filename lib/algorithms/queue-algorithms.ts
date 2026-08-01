import type { AlgorithmDef } from '@/lib/registry/types';
import type { QueueState } from '@/lib/structures/queue';

/**
 * Walks the queue from head to tail through the ring buffer, making the modulo wraparound visible:
 * the walk runs off the end of the backing array and continues from slot 0.
 */
export const ringBufferWalk: AlgorithmDef<QueueState> = {
  id: 'ring-buffer-walk',
  name: 'Ring Buffer Walk',
  description: 'Traverses the queue front to back, wrapping around the end of the backing array.',
  pseudocode: [
    'i = head',
    'for k = 0 to size-1',
    '  visit slots[i]',
    '  i = (i + 1) mod capacity',
  ],
  run: (state, t) => {
    const capacity = state.slots.length;

    t.mark(state.head, 'active');
    t.step(0, `Starting at head, slot ${state.head}. Queue holds ${state.size} value(s).`, {
      head: state.head,
      size: state.size,
    });

    let i = state.head;

    for (let k = 0; k < state.size; k++) {
      t.mark(i, 'active');
      t.step(2, `Position ${k}: slot ${i} holds ${state.slots[i]}.`, { k, i, value: state.slots[i] }, { reads: 1 });

      const nextIndex = (i + 1) % capacity;

      if (nextIndex === 0 && i === capacity - 1 && k < state.size - 1) {
        t.mark(i, 'visited').mark(nextIndex, 'compare');
        t.step(3, `Slot ${i} is the last one — wrapping around to slot 0.`, { i, next: nextIndex });
      }

      i = nextIndex;
    }

    for (let k = 0; k < state.size; k++) {
      t.mark((state.head + k) % capacity, 'visited');
    }
    t.step(3, `Walked all ${state.size} value(s) in FIFO order.`, { size: state.size });
  },
};
