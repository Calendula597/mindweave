import { useState } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  ListsToggle,
  UndoRedo,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

interface NoteEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function NoteEditor({ initialContent = '', onSave }: NoteEditorProps) {
  const [content, setContent] = useState(initialContent || '# 开始编写笔记\n\n点击这里开始编辑...\n\n## 功能特性\n\n- 支持 **粗体**、*斜体*、~~删除线~~\n- 支持列表和引用\n- 支持代码块\n- 支持表格\n- 支持图片和链接\n\n## 示例代码\n\n```javascript\nfunction hello() {\n  console.log("Hello, MindWeave!");\n}\n```\n\n| 功能 | 快捷键 |\n|------|--------|\n| 粗体 | Ctrl+B |\n| 斜体 | Ctrl+I |\n');

  const handleSave = () => {
    onSave?.(content);
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <h2>笔记编辑器</h2>
        <button className="save-button" onClick={handleSave}>
          保存
        </button>
      </div>
      <MDXEditor
        markdown={content}
        onChange={setContent}
        className="editor-content"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin({
            imageUploadHandler: async () => {
              return Promise.resolve('https://via.placeholder.com/150');
            },
          }),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'javascript' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              javascript: 'JavaScript',
              ts: 'TypeScript',
              typescript: 'TypeScript',
              python: 'Python',
              html: 'HTML',
              css: 'CSS',
              json: 'JSON',
              bash: 'Bash',
              sql: 'SQL',
            },
          }),
          diffSourcePlugin({ viewMode: 'rich-text' }),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertImage />
                <InsertTable />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}