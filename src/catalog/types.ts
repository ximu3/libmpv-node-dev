import type { commandResults, screenshotFile } from './results.js'
import type { ShapeValue } from './shape.js'
import type { PropertyValues, OptionInfo, Track } from './properties.js'
import type { MpvValue } from '../values.js'
import type { CommandDefinitions, OptionDefinitions, PropertyName } from './generated.js'

export const commandFlags = [
  'no-osd',
  'osd-auto',
  'osd-bar',
  'osd-msg',
  'osd-msg-bar',
  'raw',
  'expand-properties',
  'repeatable',
  'nonrepeatable',
  'nonscalable',
  'async',
  'sync',
] as const
export type CommandFlag = (typeof commandFlags)[number]
export type At<A, K> = K extends keyof A ? A[K] : never
type ValidFlags<S extends string, C extends string> = string extends S
  ? S
  : S extends ''
    ? S
    : S extends `${infer H}+${infer T}`
      ? H extends C
        ? ValidFlags<T, C> extends never
          ? never
          : S
        : never
      : S extends C
        ? S
        : never
export type FlagInput<C extends string, V> =
  | C
  | readonly C[]
  | (V extends string ? ValidFlags<V, C> : never)
export type IntegerArgument = bigint | `${bigint}`
export type RealArgument = number | bigint | `${number}`
export type Command =
  | readonly [string, ...MpvValue[]]
  | ({ readonly [key: string]: MpvValue } & (
      | { readonly name: string }
      | { readonly _name: string }
    ))
type CommandName<A> = A extends readonly [infer H, ...infer R]
  ? H extends CommandFlag
    ? CommandName<R>
    : H
  : A extends { readonly _name: infer N }
    ? N
    : A extends { readonly name: infer N }
      ? N
      : never
type Exact<A, P> = P extends unknown ? (Exclude<keyof A, keyof P> extends never ? P : never) : never
export type CheckedCommand<A> = A extends readonly [infer H, ...infer R]
  ? H extends CommandFlag
    ? readonly [H, ...Extract<CheckedCommand<R>, readonly unknown[]>]
    : H extends keyof CommandDefinitions<A>
      ? readonly [H, ...CommandDefinitions<A>[H]['args']]
      : A
  : string extends CommandName<A>
    ? A
    : CommandName<A> extends infer N extends keyof CommandDefinitions<A>
      ? Exact<A, CommandDefinitions<A>[N]['named'] & { readonly _flags?: readonly CommandFlag[] }>
      : A

export type { Screenshot } from './results.js'

type Result<N> = N extends keyof typeof commandResults
  ? ShapeValue<(typeof commandResults)[N]>
  : N extends keyof CommandDefinitions<never>
    ? null
    : MpvValue
type MayToggle<F> = F extends readonly (infer I)[]
  ? MayToggle<I>
  : F extends string
    ? string extends F
      ? true
      : F extends `${string}each-frame${string}`
        ? true
        : false
    : false
type ShotFlags<A> = A extends readonly unknown[]
  ? At<A, 1> | At<A, 2>
  : At<A, 'flags'> | At<A, 'legacy'>
export type CommandResult<A> = A extends readonly [CommandFlag, ...infer R]
  ? CommandResult<R>
  : CommandName<A> extends 'screenshot'
    ? true extends MayToggle<ShotFlags<A>>
      ? Result<'screenshot'>
      : ShapeValue<typeof screenshotFile>
    : Result<CommandName<A>>

type Subproperty<T, K extends string> = T extends readonly (infer V)[]
  ? K extends 'count'
    ? bigint
    : K extends `${number}`
      ? V
      : MpvValue
  : K extends keyof T
    ? Exclude<T[K], undefined>
    : MpvValue
type Path<T, K extends string> = K extends `${infer Head}/${infer Tail}`
  ? Path<Subproperty<T, Head>, Tail>
  : Subproperty<T, K>
type DynamicProperty<N> =
  N extends `current-tracks/${'video' | 'audio' | 'sub' | 'sub2'}/${infer K}`
    ? Path<Track, K>
    : N extends `current-tracks/${'video' | 'audio' | 'sub' | 'sub2'}`
      ? Track
      : N extends `option-info/${string}/${infer K}`
        ? Path<OptionInfo, K>
        : N extends `option-info/${string}`
          ? OptionInfo
          : N extends `${'metadata' | 'chapter-metadata' | 'filtered-metadata'}/by-key/${string}`
            ? string
            : N extends `${infer Root extends keyof PropertyValues}/${infer K}`
              ? Path<PropertyValues[Root], K>
              : MpvValue
export type PropertyRead<N> = N extends keyof PropertyValues
  ? PropertyValues[N]
  : N extends `${'options' | 'file-local-options'}/${infer O extends keyof OptionDefinitions}`
    ? OptionDefinitions[O]['read']
    : N extends keyof OptionDefinitions
      ? OptionDefinitions[N]['read']
      : DynamicProperty<N>
export type PropertyWrite<N> =
  N extends `${'options' | 'file-local-options'}/${infer O extends keyof OptionDefinitions}`
    ? OptionDefinitions[O]['write']
    : N extends keyof OptionDefinitions
      ? OptionDefinitions[N]['write']
      : PropertyRead<N>
export type KnownProperty = PropertyName
export type KnownOption = keyof OptionDefinitions
export type KnownCommand = keyof CommandDefinitions<never>

export type OptionInput<N> = N extends keyof OptionDefinitions
  ? OptionDefinitions[N]['write']
  : MpvValue
