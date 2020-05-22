'use strict';

import * as vscode from 'vscode';
import { join, sep } from 'path';

export class Decorator {

    private static currentDecorator: Decorator | undefined;

    private readonly rankings: RankingGroup;
    private readonly extensionPath: string;
    private readonly listener: vscode.Disposable;
    private readonly decorationType: vscode.TextEditorDecorationType;

    constructor(rankings: RankingGroup, extensionPath: string) {
        this.rankings = rankings;
        this.extensionPath = extensionPath;

        this.listener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.setDecorations(editor);
            }
        });

        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('contrastBorder'),
            gutterIconPath: join(this.extensionPath, 'media', 'icons', 'red.svg'),
            gutterIconSize: '100%'
        });
    }

    public static createDecorator(rankingFile: string, extensionPath: string): void {
        if (Decorator.currentDecorator) {
            Decorator.currentDecorator.dispose();
        }

        const rankings = rankingFile
            .split('\n')
            .slice(1)
            .filter(r => Ranking.REGEX.test(r))
            .map(r => new Ranking(r))
            .reduce((prev: RankingGroup, curr: Ranking, _currIdx: number, _arr: Ranking[]) => {
                const key = curr.getName();
                (prev[key] = prev[key] || []).push(curr);
                return prev;
            }, {});

        Decorator.currentDecorator = new Decorator(rankings, extensionPath);
    }

    private setDecorations(editor: vscode.TextEditor): void {
        const document = editor.document;
        for (const key in this.rankings) {
            if (document.fileName.includes(key)) {
                const decorationOptions = this.rankings[key]
                    .map((r: Ranking) => ({ 'range': document.lineAt(r.getLine()).range }));
                editor.setDecorations(this.decorationType, decorationOptions);
                return;
            }
        }
    }

    private dispose(): void {
        this.listener.dispose();
        Decorator.currentDecorator = undefined;
    }
}

interface RankingGroup {
    [key: string]: Ranking[]
}

class Ranking {

    public static readonly REGEX = /[\w()<>._-]+/g;

    private readonly name: string;
    private readonly line: number;
    private readonly suspiciousness: number;

    constructor(ranking: string) {
        const split = ranking.match(Ranking.REGEX);
        if (split === null) {
            throw new Error('Inaccessible point.');
        }
        this.name = split.length === 5
            ? join(split[0].replace(/\./g, sep), split[1])
            : split[0];
        this.line = +split[split.length - 2] - 1;
        this.suspiciousness = +split[split.length - 1];
    }

    public getName(): string {
        return this.name;
    }

    public getLine(): number {
        return this.line;
    }

    public getSuspiciousness(): number {
        return this.suspiciousness;
    }
}
