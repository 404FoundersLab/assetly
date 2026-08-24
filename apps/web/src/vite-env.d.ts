/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_API?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@mui/icons-material/*' {
  import { SvgIconComponent } from '@mui/icons-material';
  const Icon: SvgIconComponent;
  export default Icon;
}

declare module 'react-quill' {
  import * as React from 'react';

  export interface QuillOptions {
    theme?: string;
    modules?: Record<string, unknown>;
    formats?: string[];
    readOnly?: boolean;
    placeholder?: string;
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
  }

  export interface ReactQuillProps extends QuillOptions {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    value?: string;
    defaultValue?: string;
    onChange?: (
      value: string,
      delta: unknown,
      source: string,
      editor: { getHTML: () => string; getText: () => string; getLength: () => number }
    ) => void;
    onChangeSelection?: (range: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    onKeyPress?: React.EventHandler<React.KeyboardEvent>;
    onKeyDown?: React.EventHandler<React.KeyboardEvent>;
    onKeyUp?: React.EventHandler<React.KeyboardEvent>;
    ref?: React.Ref<{ getEditor: () => unknown; focus: () => void; blur: () => void }>;
  }

  const ReactQuill: React.ComponentType<ReactQuillProps>;
  export default ReactQuill;
}

declare module 'react-quill/dist/quill.snow.css' {}
declare module 'react-quill/dist/quill.bubble.css' {}
