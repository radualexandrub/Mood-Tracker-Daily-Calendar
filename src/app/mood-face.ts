// src/app/mood-face.ts: Simple emoticon (eyes, eyebrows, mouth) drawn in the current text color
import { Component, computed, input } from '@angular/core';
import { Mood } from './tracker';

/** Eyebrow and mouth paths on a 100x100 canvas. The eyes and the head are the same for every mood. */
const FACES: Record<Mood, { brows: string; mouth: string }> = {
  angry: {
    // Slightly lowered inner eyebrows, a restrained frown
    brows: 'M29 34 Q36 35 44 39 M56 39 Q64 35 71 34',
    mouth: 'M36 74 Q50 63 64 74',
  },
  sad: {
    // Gently raised inner eyebrows, a softer frown
    brows: 'M29 37 Q36 31 44 34 M56 34 Q64 31 71 37',
    mouth: 'M37 74 Q50 65 63 74',
  },
  neutral: {
    // Nearly flat eyebrows (but removed) and a relaxed mouth
    brows: '', /* 'M29 34 Q36 32 44 34 M56 34 Q64 32 71 34', */
    mouth: 'M36 70 Q50 72 64 70',
  },
  happy: {
    // Gentle eyebrow arches (removed) and a wider, rounded smile
    brows: '', /* 'M29 34 Q36 29 44 33 M56 33 Q64 29 71 34', */
    mouth: 'M34 64 Q50 82 66 64',
  },
};

@Component({
  selector: 'app-mood-face',
  template: `
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle class="head" cx="50" cy="50" r="44" />

      <circle class="eye" cx="36" cy="49" r="4.2" />
      <circle class="eye" cx="64" cy="49" r="4.2" />

      <path class="brow" [attr.d]="face().brows" />
      <path class="mouth" [attr.d]="face().mouth" />
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
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .head {
      stroke-width: 3.5;
    }
    .eye {
      fill: currentColor;
      stroke: none;
    }
    .brow {
      stroke-width: 3;
      opacity: 0.8;
    }
    .mouth {
      stroke-width: 4;
    }
  `,
})
export class MoodFace {
  readonly mood = input.required<Mood>();
  protected readonly face = computed(() => FACES[this.mood()]);
}