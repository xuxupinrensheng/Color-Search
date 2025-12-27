import React from 'react';

export interface ColorData {
  library: string; // e.g., "Pantone", "RAL"
  code: string;    // e.g., "7035", "19-4052"
  nameEN: string;
  nameZH: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  lab: { l: number; a: number; b: number };
  description?: string;
}

export type SearchMode = 'code' | 'camera' | 'value';

export interface TabItem {
  id: SearchMode;
  label: string;
  icon: React.ReactNode;
}