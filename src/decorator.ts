'use strict';

import * as vscode from 'vscode';
import { join, sep } from 'path';

export class Decorator {

    private static currentDecorator: Decorator | undefined;
    private readonly decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'green',
        border: '2px solid white',
    });

    private readonly listener: vscode.Disposable;
    private readonly rankings: RankingGroup;

    constructor(rankings: RankingGroup) {
        this.rankings = rankings;
        this.listener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.setDecorations(editor);
            }
        });
    }

    public static createDecorator(rankingFile: string): void {
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

        Decorator.currentDecorator = new Decorator(rankings);
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
        this.name = join(split[0].replace(/\./g, sep), split[1]);
        this.line = +split[3] - 1;
        this.suspiciousness = +split[4];
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