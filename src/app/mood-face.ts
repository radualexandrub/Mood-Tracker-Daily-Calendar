// src/app/mood-face.ts: Simple emoticon (eyes, eyebrows, mouth) drawn in the current text color
import { Component, computed, input } from '@angular/core';
import { Mood } from './tracker';

/** Eyebrow and mouth paths on a 100x100 canvas. The eyes and the head are the same for every mood. */
const FACES: Record<Mood, { brows: string; mouth: string }> = {
  angry: { brows: 'M26 30 L44 40 M56 40 L74 30', mouth: 'M34 72 Q50 60 66 72' },
  sad: { brows: 'M28 38 L44 30 M56 30 L72 38', mouth: 'M32 74 Q50 58 68 74' },
  neutral: { brows: 'M28 34 H44 M56 34 H72', mouth: 'M34 68 H66' },
  happy: { brows: 'M28 34 Q36 27 44 32 M56 32 Q64 27 72 34', mouth: 'M30 62 Q50 84 70 62' },
};

@Component({
  selector: 'app-mood-face',
  template: `
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="44" />
      <circle class="eye" cx="35" cy="52" r="4.5" />
      <circle class="eye" cx="65" cy="52" r="4.5" />
      <path [attr.d]="face().brows" />
      <path [attr.d]="face().mouth" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 1em;
      height: 1em;
      line-height: 0;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .eye {
      fill: currentColor;
      stroke: none;
    }
  `,
})
export class MoodFace {
  /** Mood whose expression should be drawn. */
  readonly mood = input.required<Mood>();
  protected readonly face = computed(() => FACES[this.mood()]);
}
