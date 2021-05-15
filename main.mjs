import * as kiwi from 'kiwi.js';

import * as CassParser from './parser.pegjs';

const { parse: parseCass } = CassParser.default;

const s_left = Symbol('L');
const s_right = Symbol('R');
const s_top = Symbol('T');
const s_bottom = Symbol('B');
const s_width = Symbol('W');
const s_height = Symbol('H');
const s_center = Symbol('C');
const s_middle = Symbol('M');

const SYMBOL_MAP = new Map(
	[
		s_left,
		s_right,
		s_top,
		s_bottom,
		s_width,
		s_height,
		s_center,
		s_middle
	].map(s => [s.description, s])
);

const NAME_PATTERN = /^[a-z_-]+$/;
const isValidName = n => Boolean(n.match(NAME_PATTERN));

const guideline = kiwi.Strength.create(0.0, 0.0, 0.5);

const makeVarMap = (solver, parent) => {
	const r = new Map([
		[s_left, new kiwi.Variable()],
		[s_right, new kiwi.Variable()],
		[s_top, new kiwi.Variable()],
		[s_bottom, new kiwi.Variable()],
		[s_width, new kiwi.Variable()],
		[s_height, new kiwi.Variable()],
		[s_center, new kiwi.Variable()],
		[s_middle, new kiwi.Variable()]
	]);

	solver.addConstraint(
		new kiwi.Constraint(
			r.get(s_left).plus(r.get(s_width)),
			kiwi.Operator.Eq,
			r.get(s_right),
			kiwi.Strength.required
		)
	);

	solver.addConstraint(
		new kiwi.Constraint(
			r.get(s_top).plus(r.get(s_height)),
			kiwi.Operator.Eq,
			r.get(s_bottom),
			kiwi.Strength.required
		)
	);

	solver.addConstraint(
		new kiwi.Constraint(
			r.get(s_center),
			kiwi.Operator.Eq,
			r.get(s_left).plus(r.get(s_width).divide(2)),
			kiwi.Strength.required
		)
	);

	solver.addConstraint(
		new kiwi.Constraint(
			r.get(s_middle),
			kiwi.Operator.Eq,
			r.get(s_top).plus(r.get(s_height).divide(2)),
			kiwi.Strength.required
		)
	);

	return r;
};

registerLayout(
	'casscade',
	class {
		static inputProperties = ['--rule'];
		static childInputProperties = ['--name'];

		// currently: all children are blockified
		async intrinsicSizes() {}

		async layout(children, edges, constraintSpace, styles) {
			try {
				const solver = new kiwi.Solver();
				const parentVars = makeVarMap(solver);

				solver.addConstraint(
					new kiwi.Constraint(
						parentVars.get(s_left),
						kiwi.Operator.Eq,
						0,
						kiwi.Strength.required
					)
				);

				solver.addConstraint(
					new kiwi.Constraint(
						parentVars.get(s_top),
						kiwi.Operator.Eq,
						0,
						kiwi.Strength.required
					)
				);

				solver.addConstraint(
					new kiwi.Constraint(
						parentVars.get(s_width),
						kiwi.Operator.Eq,
						constraintSpace.fixedInlineSize,
						kiwi.Strength.required
					)
				);

				solver.addConstraint(
					new kiwi.Constraint(
						parentVars.get(s_height),
						kiwi.Operator.Eq,
						constraintSpace.fixedBlockSize,
						kiwi.Strength.required
					)
				);

				const childVars = [];

				for (const child of children) {
					const vars = makeVarMap(solver, parentVars);

					childVars.push(vars);

					const name = child.styleMap
						.get('--name')
						?.toString()
						?.trim();

					if (name) {
						if (!isValidName(name))
							throw new Error(`not a valid --name: ${name}`);
						parentVars.set(name, vars);
					}
				}

				const constraints = styles.get('--rule')?.toString();
				if (constraints) {
					parseCass(constraints, {
						solver,
						kiwi,
						syms: SYMBOL_MAP,
						vars: parentVars
					});
				}

				solver.updateVariables();

				const promises = [];
				for (let i = 0, len = children.length; i < len; i++) {
					const child = children[i];
					const vars = childVars[i];

					promises.push(
						child
							.layoutNextFragment({
								fixedInlineSize: vars.get(s_width).value(),
								fixedBlockSize: vars.get(s_height).value()
							})
							.then(fragment => {
								fragment.inlineOffset = vars
									.get(s_left)
									.value();
								fragment.blockOffset = vars.get(s_top).value();
								return fragment;
							})
					);
				}

				return {
					childFragments: await Promise.all(promises)
				};
			} catch (error) {
				console.error(error);
				throw error;
			}
		}
	}
);
