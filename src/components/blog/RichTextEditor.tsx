'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// ── Toolbar button helper ──────────────────────────────────────────────────
function Btn({
  onClick, active, title, children, className = '',
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`px-2 py-1 rounded text-sm leading-none transition-colors
        ${active ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-200 text-gray-700'}
        ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-300 mx-0.5 self-center" />;
}

// ── Link Dialog ────────────────────────────────────────────────────────────
function LinkDialog({
  onInsert,
  onClose,
  initial,
}: {
  onInsert: (href: string, target: string, rel: string) => void;
  onClose: () => void;
  initial?: { href: string; target: string; rel: string };
}) {
  const [href, setHref] = useState(initial?.href ?? 'https://');
  const [newTab, setNewTab] = useState(initial?.target === '_blank');
  const [noReferrer, setNoReferrer] = useState(
    initial?.rel?.includes('noreferrer') ?? false
  );

  const rel = [
    noReferrer ? 'noreferrer noopener' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[400px] space-y-4">
        <h3 className="font-semibold text-gray-800">Insert Link</h3>

        <div>
          <label className="block text-xs text-gray-500 mb-1">URL</label>
          <input
            autoFocus
            type="url"
            value={href}
            onChange={e => setHref(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={newTab} onChange={e => setNewTab(e.target.checked)} />
          Open in new tab
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={noReferrer} onChange={e => setNoReferrer(e.target.checked)} />
          <span>Add <code className="bg-gray-100 px-1 rounded text-xs">rel="noreferrer noopener"</code></span>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onInsert(href, newTab ? '_blank' : '_self', rel)}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Image Dialog ───────────────────────────────────────────────────────────
function ImageDialog({
  onInsert,
  onClose,
}: {
  onInsert: (src: string, alt: string, title: string) => void;
  onClose: () => void;
}) {
  const [src, setSrc] = useState('https://');
  const [alt, setAlt] = useState('');
  const [title, setTitle] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] space-y-4">
        <h3 className="font-semibold text-gray-800">Insert Image</h3>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Image URL</label>
          <input
            autoFocus
            type="url"
            value={src}
            onChange={e => setSrc(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Alt Text <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={alt}
            onChange={e => setAlt(e.target.value)}
            placeholder="Describe the image (for SEO & accessibility)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Title (tooltip on hover)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onInsert(src, alt, title)}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Editor ────────────────────────────────────────────────────────────
export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Subscript,
      Superscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Placeholder.configure({
        placeholder: 'Write your blog content here...',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync external value changes (edit mode prefill)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false as never);
    }
  }, [value, editor]);

  const toggleSourceMode = useCallback(() => {
    if (!editor) return;
    if (!sourceMode) {
      setSourceHtml(editor.getHTML());
      setSourceMode(true);
    } else {
      editor.commands.setContent(sourceHtml, false as never);
      onChange(sourceHtml);
      setSourceMode(false);
    }
  }, [editor, sourceMode, sourceHtml, onChange]);

  const insertLink = (href: string, target: string, rel: string) => {
    if (!editor) return;
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(
        `<a href="${href}" target="${target}" rel="${rel}">${href}</a>`
      ).run();
    } else {
      editor.chain().focus().setLink({ href, target, rel }).run();
    }
    setShowLinkDialog(false);
  };

  const insertImage = (src: string, alt: string, title: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src, alt, title }).run();
    setShowImageDialog(false);
  };

  if (!mounted) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[200px]">
        <p className="text-gray-400 text-sm">Loading editor...</p>
      </div>
    );
  }

  if (!editor) return null;

  const charCount = editor.storage.characterCount?.characters?.() ?? 0;
  const wordCount = editor.storage.characterCount?.words?.() ?? 0;

  return (
    <>
      {showLinkDialog && (
        <LinkDialog
          onInsert={insertLink}
          onClose={() => setShowLinkDialog(false)}
          initial={
            editor.isActive('link')
              ? {
                  href: editor.getAttributes('link').href ?? '',
                  target: editor.getAttributes('link').target ?? '_self',
                  rel: editor.getAttributes('link').rel ?? '',
                }
              : undefined
          }
        />
      )}
      {showImageDialog && (
        <ImageDialog onInsert={insertImage} onClose={() => setShowImageDialog(false)} />
      )}

      <div className="border border-gray-300 rounded-lg overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="border-b border-gray-200 bg-gray-50 px-2 py-1.5 flex flex-wrap items-center gap-0.5">

          {/* History */}
          <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">↩</Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">↪</Btn>
          <Divider />

          {/* Block format dropdown */}
          <select
            title="Block format"
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1'
              : editor.isActive('heading', { level: 2 }) ? 'h2'
              : editor.isActive('heading', { level: 3 }) ? 'h3'
              : editor.isActive('heading', { level: 4 }) ? 'h4'
              : editor.isActive('heading', { level: 5 }) ? 'h5'
              : editor.isActive('heading', { level: 6 }) ? 'h6'
              : editor.isActive('blockquote') ? 'blockquote'
              : editor.isActive('codeBlock') ? 'codeBlock'
              : 'p'
            }
            onChange={e => {
              const v = e.target.value;
              if (v === 'p') editor.chain().focus().setParagraph().run();
              else if (v === 'blockquote') editor.chain().focus().toggleBlockquote().run();
              else if (v === 'codeBlock') editor.chain().focus().toggleCodeBlock().run();
              else editor.chain().focus().toggleHeading({ level: parseInt(v.slice(1)) as 1|2|3|4|5|6 }).run();
            }}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
            <option value="blockquote">Blockquote</option>
            <option value="codeBlock">Code Block</option>
          </select>
          <Divider />

          {/* Inline formatting */}
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <strong>B</strong>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <em>I</em>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <u>U</u>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <s>S</s>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
            {'</>'}
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
            X<sub>2</sub>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
            X<sup>2</sup>
          </Btn>
          <Divider />

          {/* Text color */}
          <label className="flex items-center gap-1 cursor-pointer px-1 py-1 rounded hover:bg-gray-200" title="Text Color">
            <span className="text-xs text-gray-600">A</span>
            <input
              type="color"
              defaultValue="#000000"
              onChange={e => editor.chain().focus().setColor(e.target.value).run()}
              className="w-5 h-4 border-0 p-0 cursor-pointer rounded"
            />
          </label>

          {/* Highlight color */}
          <label className="flex items-center gap-1 cursor-pointer px-1 py-1 rounded hover:bg-gray-200" title="Highlight Color">
            <span className="text-xs bg-yellow-200 px-1 rounded">H</span>
            <input
              type="color"
              defaultValue="#FEF08A"
              onChange={e => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
              className="w-5 h-4 border-0 p-0 cursor-pointer rounded"
            />
          </label>
          <Divider />

          {/* Alignment */}
          <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">≡</Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">≡</Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">≡</Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">≡</Btn>
          <Divider />

          {/* Lists */}
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">• List</Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">1. List</Btn>
          <Divider />

          {/* Link */}
          <Btn onClick={() => setShowLinkDialog(true)} active={editor.isActive('link')} title="Insert / Edit Link">🔗</Btn>
          {editor.isActive('link') && (
            <Btn onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link" className="text-red-500">✕</Btn>
          )}

          {/* Image */}
          <Btn onClick={() => setShowImageDialog(true)} title="Insert Image with Alt">🖼</Btn>
          <Divider />

          {/* Table */}
          <Btn
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insert Table"
          >⊞</Btn>
          {editor.isActive('table') && (
            <>
              <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column">+Col</Btn>
              <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row">+Row</Btn>
              <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table" className="text-red-500">Del Table</Btn>
            </>
          )}
          <Divider />

          {/* HR */}
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">―</Btn>
          <Btn onClick={() => editor.chain().focus().setHardBreak().run()} title="Line Break">↵</Btn>
          <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">✕ Format</Btn>
          <Divider />

          {/* Source / HTML view */}
          <Btn
            onClick={toggleSourceMode}
            active={sourceMode}
            title="Toggle HTML Source View"
            className="font-mono text-xs"
          >
            {'</>'}  HTML
          </Btn>
        </div>

        {/* ── Editor Area ── */}
        {sourceMode ? (
          <textarea
            value={sourceHtml}
            onChange={e => setSourceHtml(e.target.value)}
            className="w-full min-h-[400px] px-4 py-3 font-mono text-sm bg-gray-950 text-green-400 focus:outline-none resize-y"
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} className="bg-white" />
        )}

        {/* ── Status bar ── */}
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-1.5 flex items-center justify-between text-xs text-gray-400">
          <span>
            {wordCount} words · {charCount} characters
          </span>
          <span>
            Tip: Select text then click 🔗 to add a link
          </span>
        </div>
      </div>
    </>
  );
}
