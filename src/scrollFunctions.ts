import * as vscode from 'vscode'
import { checkSplitPanels, calculateRange, wholeLine, calculatePosition } from './utils'
import { ModeState, AllStates } from './states'

export let scrollingTask: NodeJS.Timeout
export let scrollingTaskFinal: NodeJS.Timeout
export let isFinalScrolling = false;
export let scrollingEditor: vscode.TextEditor | null
export let correspondingLinesHighlight: vscode.TextEditorDecorationType | undefined
export const scrolledEditorsQueue: Set<vscode.TextEditor> = new Set()
export const offsetByEditors: Map<vscode.TextEditor, number> = new Map()

export const reset = () => {
    offsetByEditors.clear()
    scrolledEditorsQueue.clear()
    scrollingEditor = null
    clearTimeout(scrollingTask)
    correspondingLinesHighlight?.dispose()
}

export const setCorrespondingLinesHighlight = (decoratorType: vscode.TextEditorDecorationType) => {
    correspondingLinesHighlight = decoratorType;
}

let vscodeContext: vscode.ExtensionContext;
export let modeState: ModeState;

export const setContext= (context: vscode.ExtensionContext) => {
    vscodeContext = context;
    modeState = new ModeState(context)
}

export const handleDidChangeVisibleEditors = (textEditors: vscode.TextEditor[]) => {
    AllStates.areVisible = checkSplitPanels(textEditors)
    reset()
}

export const handleDidChangeEditoSelect = (event: vscode.TextEditorSelectionChangeEvent) => {
    const { selections, textEditor } = event;
    if (!AllStates.areVisible || modeState.isOff() || textEditor.viewColumn === undefined || textEditor.document.uri.scheme === 'output') {
        return
    }
    correspondingLinesHighlight?.dispose()
    setCorrespondingLinesHighlight(vscode.window.createTextEditorDecorationType({ backgroundColor: new vscode.ThemeColor('editor.inactiveSelectionBackground') }))
    vscode.window.visibleTextEditors
        .filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
        .forEach((scrolledEditor) => {
            scrolledEditor.setDecorations(
                correspondingLinesHighlight!,
                selections.map(selection => calculateRange(selection, offsetByEditors.get(scrolledEditor))),
            )
        })
};

export const handleScroll = (event: vscode.TextEditorVisibleRangesChangeEvent): any => {
    const {textEditor, visibleRanges} = event;
    if (true) {
        if (scrollingTaskFinal) {
            clearTimeout(scrollingTaskFinal);
        }
        if (!isFinalScrolling) {
            isFinalScrolling = true;
            scrollingTaskFinal = setTimeout(() => {
                vscode.window.visibleTextEditors
                    .filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
                    .forEach(scrolledEditor => {
                        scrolledEditorsQueue.add(scrolledEditor)
                        if (textEditor.visibleRanges[0].start !== scrolledEditor.visibleRanges[0].start) {
                            scrolledEditor.revealRange(
                                calculateRange(visibleRanges[0], offsetByEditors.get(scrolledEditor), textEditor, scrolledEditor),
                                vscode.TextEditorRevealType.AtTop,
                            )
                        }
                    })
            }, 100)
            setTimeout(() => isFinalScrolling = false, 0)
        }
    }
    if (!AllStates.areVisible || modeState.isOff() || textEditor.viewColumn === undefined || textEditor.document.uri.scheme === 'output') {
        return
    }
    if (scrollingEditor !== textEditor) {
        if (scrolledEditorsQueue.has(textEditor)) {
            scrolledEditorsQueue.delete(textEditor)
            return
        }
        scrollingEditor = textEditor
        if (modeState.isOffsetMode()) {
            vscode.window.visibleTextEditors
                .filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
                .forEach(scrolledEditor => {
                    offsetByEditors.set(scrolledEditor, scrolledEditor.visibleRanges[0].start.line - textEditor.visibleRanges[0].start.line)
                })
        } else if (modeState.isNormalMode()) {
            offsetByEditors.clear()
        }
    }
    if (scrollingTask) {
        clearTimeout(scrollingTask)
    }
    scrollingTask = setTimeout(() => {
        vscode.window.visibleTextEditors
            .filter(editor => editor !== textEditor && editor.document.uri.scheme !== 'output')
            .forEach(scrolledEditor => {
                scrolledEditorsQueue.add(scrolledEditor)
                scrolledEditor.revealRange(
                    calculateRange(visibleRanges[0], offsetByEditors.get(scrolledEditor), textEditor, scrolledEditor),
                    vscode.TextEditorRevealType.AtTop,
                )
            })
    }, 5)
}