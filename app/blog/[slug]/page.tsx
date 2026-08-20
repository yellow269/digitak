import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { createPublicSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { AFFILIATE_DISCLOSURE_SHORT, SITE_NAME } from '@/lib/constants';
import type { BlogPost } from '@/lib/types';

export const revalidate = 3600;

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) {
    console.error('[BlogPost] Error fetching post:', error.message);
    return null;
  }
  return data as BlogPost | null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Article not found' };
  const title = post.seo_title || `${post.title} | ${SITE_NAME}`;
  const description = post.seo_description || post.excerpt || '';
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      images: post.featured_image ? [{ url: post.featured_image }] : [],
      publishedTime: post.published_at || post.created_at,
      authors: post.author ? [post.author] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.featured_image ? [post.featured_image] : [],
    },
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const tags: string[] = Array.isArray(post.tags) ? post.tags : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    image: post.featured_image,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: post.author || SITE_NAME },
  };

  const htmlContent = renderMarkdown(post.content);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Button asChild variant="ghost" size="sm" className="mb-4 gap-1">
        <Link href="/blog">
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>
      </Button>

      {post.category && <Badge className="mb-3">{post.category}</Badge>}
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{post.title}</h1>

      <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
        {post.author && <span>By {post.author}</span>}
        <span>·</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(post.published_at || post.created_at)}
        </span>
      </div>

      {post.featured_image && (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-xl">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {post.excerpt && <p className="mt-6 text-lg text-slate-600">{post.excerpt}</p>}

      <div className="prose prose-slate mt-8 max-w-none">
        <div
          className="text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="gap-1">
              <Tag className="h-3 w-3" />
              {t}
            </Badge>
          ))}
        </div>
      )}

      <Card className="mt-8 border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">{AFFILIATE_DISCLOSURE_SHORT}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Simple Markdown renderer — safe, no external dependencies.
 * Converts basic Markdown to HTML with XSS-safe output.
 * Handles: headings, bold, italic, links, images, lists, code, blockquotes, horizontal rules, paragraphs.
 */
function renderMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const html: string[] = [];
  let inList = false;
  let listType = '';
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (const raw of lines) {
    const line = raw;

    // Fenced code blocks
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre class="bg-slate-100 rounded-lg p-4 overflow-x-auto text-sm"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const text = inlineMarkdown(headingMatch[2]);
      html.push(`<h${level} class="font-bold text-slate-900 mt-6 mb-3">${text}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      closeList();
      html.push('<hr class="my-6 border-slate-200" />');
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList();
        html.push('<ul class="list-disc pl-6 space-y-1 my-3">');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li>${inlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^[\s]*\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList();
        html.push('<ol class="list-decimal pl-6 space-y-1 my-3">');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li>${inlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      closeList();
      const text = inlineMarkdown(line.replace(/^>\s?/, ''));
      html.push(`<blockquote class="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-3">${text}</blockquote>`);
      continue;
    }

    // Regular paragraph
    closeList();
    html.push(`<p class="my-3">${inlineMarkdown(line)}</p>`);
  }

  closeList();

  if (inCodeBlock && codeLines.length > 0) {
    html.push(`<pre class="bg-slate-100 rounded-lg p-4 overflow-x-auto text-sm"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return html.join('\n');

  function closeList() {
    if (inList) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = '';
    }
  }
}

function inlineMarkdown(text: string): string {
  let result = escapeHtml(text);
  // Images: ![alt](src)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded my-2 max-w-full" />');
  // Links: [text](href)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-sky-600 hover:underline" rel="noopener noreferrer">$1</a>');
  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm">$1</code>');
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
