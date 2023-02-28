declare module "require-in-the-middle" {
  interface Hook<TModule> {
    unhook(): void
  }

  function Hook<TModule>(
    modules: string[],
    onrequire: (exports: TModule, name: string, basedir: string) => TModule
  ): Hook<TModule>

  function Hook<TModule>(
    modules: string[],
    options: { internals: boolean },
    onrequire: (exports: TModule, name: string, basedir: string) => TModule
  ): Hook<TModule>

  export = Hook
}
