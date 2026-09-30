// Real command-pattern primitive for Photo Studio's engine layer (spec:
// "Every operation must modify the document model through commands").
// Framework-agnostic — no React, no Fabric import — so it can sit above
// any renderer and be unit-tested without a browser/canvas.

export interface Command {
  // Shown verbatim in the History panel ("Move Layer", "Apply Filter: Blur",
  // ...) -- matches the mandate's "named operations" requirement.
  readonly label: string;
  execute(): void;
  undo(): void;
  // Optional: when a command's redo isn't simply re-running execute() (e.g.
  // execute() captures fresh "before" state that would be wrong to redo
  // against), provide this. Defaults to execute() when omitted.
  redo?(): void;
}

// Groups a run of continuous sub-operations (a single brush stroke's many
// paint calls, a drag-to-move's many intermediate positions) into ONE
// history entry -- the mandate's explicit "do not create a history entry
// for every mousemove; group continuous operations into a single
// transaction" requirement. Construct it, call add() for each
// sub-operation as it happens (or just once at the end with a single
// "apply the final state" command), then hand the finished MacroCommand
// to CommandManager.execute() as a single unit. undo()/redo() replay the
// grouped commands in reverse/forward order.
export class MacroCommand implements Command {
  readonly label: string;
  private readonly commands: Command[];

  constructor(label: string, commands: Command[]) {
    this.label = label;
    this.commands = commands;
  }

  execute(): void {
    for (const c of this.commands) c.execute();
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i].undo();
  }

  redo(): void {
    for (const c of this.commands) (c.redo || c.execute).call(c);
  }
}
