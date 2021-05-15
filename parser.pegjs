{
	const kiwi = options.kiwi;
	const symbols = options.syms;
	const vars = options.vars;
	const solver = options.solver;
}

constraints
	= WS constraint_list? WS
	;

constraint_list
	= constraint (WS "," WS constraint)*
	;

constraint
	= l:expression WS op:op WS r:expression WS str:strength?
	{
		solver.addConstraint(
			new kiwi.Constraint(
				l, op, r, str ?? kiwi.Strength.medium
			)
		);
	}
	;

expression
	= '(' WS ex:expression WS ')' { return ex }
	/ muldiv_expression
	;

muldiv_expression
	= root:addsub_expression ops:(WS op:[*/] WS t:addsub_expression { return [op, t] })*
	{
		let cur = root;

		for (const [op, t] of ops) {
			if (typeof cur === 'number') {
				if (typeof t === 'number') {
					cur = (op === '*')
						? cur * t
						: cur / t;
				} else if (op === '*') {
					cur = t.multiply(cur);
				} else {
					throw new Error('cannot divide by non-constant term');
				}
			} else {
				cur = (op === '*')
					? cur.multiply(t)
					: cur.divide(t);
			}
		}

		return cur;
	}
	;

addsub_expression
	= root:term ops:(WS op:[+-] WS t:term { return [op, t] })*
	{
		let cur = root;

		for (const [op, t] of ops) {
			if (typeof cur === 'number') {
				if (typeof t === 'number') {
					cur = (op === '+')
						? cur + t
						: cur - t;
				} else {
					cur = (op === '+')
						? t.plus(cur)
						: t.multiply(-1).plus(cur);
				}
			} else {
				cur = (op === '+')
					? cur.plus(t)
					: cur.minus(t);
			}
		}

		return cur;
	}
	;

term
	= variable_term
	/ number_term
	;

variable_term
	= root:id_sym acc:(WS "." WS i:id_sym { return i })*
	{
		let hitSym = typeof root === 'symbol' && root;
		let cur = vars.get(root);

		for (const is of acc) {
			if (hitSym) throw new Error(
				`cannot perform member access on symbol: ${hitSym.description}`
			);

			if (typeof is === 'symbol') {
				hitSym = is;
			}

			cur = cur.get(is);
		}

		if (!hitSym) {
			throw new Error('terms must finish with symbol');
		}

		return cur;
	}
	;

number_term
	= i:$("-"? [0-9]+ "." [0-9]+) { return parseFloat(i) }
	/ i:$("-"? [0-9]+) { return parseInt(i, 10) }
	;

op
	= "==" { return kiwi.Operator.Eq }
	/ "<=" { return kiwi.Operator.Le }
	/ ">=" { return kiwi.Operator.Ge }
	;

strength
	= "!strong" { return kiwi.Strength.strong }
	/ "!normal" { return kiwi.Strength.medium }
	/ "!weak"   { return kiwi.Strength.weak   }
	;

id_sym
	= ID
	/ SYM
	;

SYM
	= s:$[A-Z]+
	{
		const r = symbols.get(s);
		if (!r) throw new Error(`no such symbol: ${s}`);
		return r;
	}
	;

ID
	= $[a-z_]+
	;

WS
	= [ \t\r\n]* {}
	;
