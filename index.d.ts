declare module "require-in-the-middle" {
  interface Hook {
    unhook(): void
  }

  function Hook<Module>(
    modules: string[],
    onrequire: (exports: Module, name: string, basedir: string) => Module
  ): Hook

  function Hook<Module>(
    modules: string[],
    options: { internals: boolean },
    onrequire: (exports: Module, name: string, basedir: string) => Module
  ): Hook

  export = Hook
}
