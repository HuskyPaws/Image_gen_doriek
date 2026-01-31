'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Copy, Check, Trash2 } from 'lucide-react';

export default function ScriptCleanerPage() {
  const [inputScript, setInputScript] = useState('');
  const [outputScript, setOutputScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);

  function cleanScript() {
    if (!inputScript.trim()) return;

    // Regex to match anything in square brackets [...]
    const bracketPattern = /\[[^\]]+\]/g;
    
    // Count matches before removing
    const matches = inputScript.match(bracketPattern);
    setRemovedCount(matches ? matches.length : 0);

    // Remove the bracketed content and clean up extra blank lines
    const cleaned = inputScript
      .replace(bracketPattern, '') // Remove all [bracketed] content
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
      .trim();

    setOutputScript(cleaned);
  }

  function handleCopy() {
    if (!outputScript) return;
    navigator.clipboard.writeText(outputScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setInputScript('');
    setOutputScript('');
    setRemovedCount(0);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Script Cleaner
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Remove bracketed cues like [CONTEXT: 8-30 seconds] from your script
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Input Script</CardTitle>
            <CardDescription>
              Paste your script with bracketed cues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your script here...

Example:
[HOOK: 0-8 seconds]On April 16th, 1945, American military police knocked on the doors...
[CONTEXT: 8-30 seconds]Nobody told them where they were going.
[INVESTMENT: 30-60 seconds]What happened would be documented..."
              value={inputScript}
              onChange={(e) => setInputScript(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {inputScript.length} characters
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={!inputScript}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={cleanScript}
                  disabled={!inputScript.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Clean Script
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cleaned Script</span>
              {removedCount > 0 && (
                <span className="text-sm font-normal text-green-600 dark:text-green-400">
                  Removed {removedCount} cue{removedCount !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Your script without the bracketed cues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Cleaned script will appear here..."
              value={outputScript}
              readOnly
              className="min-h-[400px] font-mono text-sm bg-slate-50 dark:bg-slate-900"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {outputScript.length} characters
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!outputScript}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            What gets removed?
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            This tool removes <strong>anything in square brackets</strong> [like this]:
          </p>
          <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200 text-sm font-mono">
            <li>• [HOOK: 0-8 seconds]</li>
            <li>• [TITLE CARD: 1:00]</li>
            <li>• [BUILDING THE WORLD: Minutes 1-3]</li>
            <li>• [PATTERN INTERRUPT - PERSPECTIVE SHIFT: 3:00]</li>
            <li>• [anything in brackets]</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

