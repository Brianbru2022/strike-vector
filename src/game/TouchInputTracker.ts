import { InputAction } from '../types/game';

/** Keeps simultaneous pointers independent so releasing one finger cannot cancel another. */
export class TouchInputTracker {
  private readonly pointersByAction = new Map<InputAction, Set<number>>();

  press(action: InputAction, pointerId: number): boolean {
    const pointers = this.pointersByAction.get(action) ?? new Set<number>();
    const wasInactive = pointers.size === 0;
    pointers.add(pointerId);
    this.pointersByAction.set(action, pointers);
    return wasInactive;
  }

  release(action: InputAction, pointerId: number): boolean {
    const pointers = this.pointersByAction.get(action);
    if (!pointers) return false;
    pointers.delete(pointerId);
    if (pointers.size > 0) return false;
    this.pointersByAction.delete(action);
    return true;
  }

  releaseAll(): InputAction[] {
    const active = [...this.pointersByAction.keys()];
    this.pointersByAction.clear();
    return active;
  }
}
