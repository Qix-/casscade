import fs from 'fs';

import gulp from 'gulp';
import { rollup } from 'gulp-rollup-2';

import rollupResolve from '@rollup/plugin-node-resolve';
import rollupPegjs from 'rollup-plugin-pegjs';
import { terser as rollupTerser } from 'rollup-plugin-terser';

export const buildCassowary = () =>
	gulp
		.src(['./main.mjs', './parser.pegjs'])
		.pipe(
			rollup({
				input: './main.mjs',
				plugins: [
					rollupResolve({
						extensions: ['.mjs']
					}),
					rollupPegjs()
					//rollupTerser()
				],
				output: [
					{
						file: 'casscade.js',
						format: 'iife'
					}
				]
			})
		)
		.pipe(gulp.dest('./'));

export default gulp.parallel(buildCassowary);
