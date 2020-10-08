import RollupPluginTypescript from '@wessberg/rollup-plugin-ts';
import { builtinModules } from 'module';
import * as Rollup from 'rollup';
import * as Typescript from 'typescript';
import { dependencies } from './package.json';


const nodeModuleRx = new RegExp(
  `^(?:${[...Object.keys(dependencies), ...builtinModules].join('|')})(?:\/.*)?$`
);

/** @type {Rollup.RollupOptions} */
const config = {
  input: './src/index.ts',
  output: {
    dir: './dist',
    format: 'commonjs',
    sourcemap: true,
  },
  external(source) {
    return nodeModuleRx.test(source);
  },
  plugins: [
    RollupPluginTypescript({
      transpiler: 'typescript',
      typescript: Typescript,
      transpileOnly: false,
    }),
  ],
};

export default config;
