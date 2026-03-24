import React, { Fragment, useMemo } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface MarkdownMessageProps {
  text: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
}

interface MarkdownSegment {
  text: string;
  isBold: boolean;
}

function parseLine(line: string): MarkdownSegment[] {
  const boldPattern = /\*\*(.+?)\*\*/g;
  const segments: MarkdownSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(line)) !== null) {
    const [full, boldText] = match;
    if (match.index > cursor) {
      segments.push({
        text: line.slice(cursor, match.index),
        isBold: false,
      });
    }
    segments.push({
      text: boldText,
      isBold: true,
    });
    cursor = match.index + full.length;
  }

  if (cursor < line.length) {
    segments.push({
      text: line.slice(cursor),
      isBold: false,
    });
  }

  if (segments.length === 0) {
    return [{ text: '', isBold: false }];
  }
  return segments;
}

export function MarkdownMessage({ text, style, boldStyle }: MarkdownMessageProps) {
  const lines = useMemo(() => {
    const source = String(text ?? '');
    return source.split(/\r?\n/).map(parseLine);
  }, [text]);

  return (
    <Text style={style}>
      {lines.map((lineSegments, lineIndex) => (
        <Fragment key={`markdown-line-${lineIndex}`}>
          {lineSegments.map((segment, segIndex) => (
            <Text
              key={`markdown-segment-${lineIndex}-${segIndex}`}
              style={segment.isBold ? boldStyle : undefined}
            >
              {segment.text}
            </Text>
          ))}
          {lineIndex < lines.length - 1 ? '\n' : null}
        </Fragment>
      ))}
    </Text>
  );
}

