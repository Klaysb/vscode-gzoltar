'use strict';

import * as vscode from 'vscode';
import { join } from 'path';
import { Ranking, RankingLine, RankingGroup } from './ranking';

export class Decorator {

    private static currentDecorator: Decorator | undefined;

    private readonly rankings: Ranking;
    private readonly extensionPath: string;
    private readonly listener: vscode.Disposable;

    private readonly lowDecor: vscode.TextEditorDecorationType;
    private readonly mediumDecor: vscode.TextEditorDecorationType;
    private readonly highDecor: vscode.TextEditorDecorationType;
    private readonly veryHighDecor: vscode.TextEditorDecorationType;

    private constructor(rankings: Ranking, extensionPath: string) {
        this.rankings = rankings;
        this.extensionPath = extensionPath;

        this.listener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.setDecorations(editor);
            }
        });

        this.lowDecor = this.createDecoration(join(this.extensionPath, 'media', 'icons', 'green.svg'));
        this.mediumDecor = this.createDecoration(join(this.extensionPath, 'media', 'icons', 'yellow.svg'));
        this.highDecor = this.createDecoration(join(this.extensionPath, 'media', 'icons', 'orange.svg'));
        this.veryHighDecor = this.createDecoration(join(this.extensionPath, 'media', 'icons', 'red.svg'));
    }

    private createDecoration(path: string): vscode.TextEditorDecorationType {
        return vscode.window.createTextEditorDecorationType({
            gutterIconPath: path,
            gutterIconSize: '100%'
        });
    }

    private setDecorations(editor: vscode.TextEditor): void {
        const document = editor.document;
        const key = Object
            .keys(this.rankings)
            .find(key => document.fileName.includes(key));

        if (key) {
            const group = this.rankings[key];
            editor.setDecorations(this.lowDecor, group.low.map(l => ({ 'range': document.lineAt(l.getLine()).range })));
            editor.setDecorations(this.mediumDecor, group.medium.map(l => ({ 'range': document.lineAt(l.getLine()).range })));
            editor.setDecorations(this.highDecor, group.high.map(l => ({ 'range': document.lineAt(l.getLine()).range })));
            editor.setDecorations(this.veryHighDecor, group.veryHigh.map(l => ({ 'range': document.lineAt(l.getLine()).range })));
        }
    }

    private dispose(): void {
        this.listener.dispose();
        Decorator.currentDecorator = undefined;
    }

    public static createDecorator(rankingFile: string, extensionPath: string): Decorator {
        if (Decorator.currentDecorator) {
            Decorator.currentDecorator.dispose();
        }

        let maxProbability = 0.0;
        const ranking = rankingFile
            .split('\n')
            .slice(1)
            .filter(r => RankingLine.REGEX.test(r))
            .map(r => new RankingLine(r))
            .reduce((prev: Ranking, curr: RankingLine, _currIdx: number, _arr: RankingLine[]) => {
                const key = curr.getName();
                const susp = curr.getSuspiciousness();
                (prev[key] = prev[key] || new RankingGroup()).lines.push(curr);
                maxProbability = susp > maxProbability ? susp : maxProbability;
                return prev;
            }, {});

        for (const key in ranking) {
            Decorator.splitProbability(ranking[key], maxProbability);
        }

        return new Decorator(ranking, extensionPath);
    }
    
    private static splitProbability(group: RankingGroup, maxProbability: number): void {
        if (maxProbability === 0) {
            group.low.push(...group.lines);
            return;
        }

        group.lines.forEach((line) => {
            const div = line.getSuspiciousness() / maxProbability;
            if (div < 0.40) {
                group.low.push(line);
            }
            else if (div < 0.60) {
                group.medium.push(line);
            }
            else if (div < 0.85) {
                group.high.push(line);
            }
            else {
                group.veryHigh.push(line);
            }
        });
    }
}