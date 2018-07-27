const immutable = require("immutable");
const CheckError = require("./error");
const defaultOptions = require("../defaultOptions");

/* Types */

/*
fn(number) -> number => fn[a'](a') -> a'
checkFunction:
1) replaceMorphs -- forall morphs -> random scalars
2) For args, checkLValue
3) assert cast reify(check(body)) to res
*/

const TYPE_MISMATCH = "mismatch";
const TYPE_MORPH = "morph";
const TYPE_ANY = "any";
const TYPE_OR = "or";
const TYPE_FUNCTION = "function";
const TYPE_SCALAR = "scalar";

const any = {
  type: TYPE_ANY
};

function morph(name) {
  return {
    type: TYPE_MORPH,
    name: name
  };
}

function scalar(name) {
  return {
    type: TYPE_SCALAR,
    name: name
  };
}

function fun(morphs, args, res) {
  return {
    type: TYPE_FUNCTION,
    morphs: morphs,
    args: args,
    res: res
  };
}

function mismatch(to, from) {
	return {
  	type: TYPE_MISMATCH,
    to: to,
  	from: from
 	};
}

function isMismatched({ type }) {
	return type === TYPE_MISMATCH;
}

let typeNameCounter = 0;
function uniqueTypeName() {
	return `t${typeNameCounter++}`;
}

function uniqueMorph() {
  return morph(uniqueTypeName());
}

function uniqueScalar() {
  return morph(uniqueTypeName());
}

function readableType(type, context) {
	switch(type.type) {
    case TYPE_MISMATCH:
    	return `Can't cast ${readableType(type.from, context)} to ${readableType(type.to, context)}`;
    case TYPE_MORPH:
    	return context.get(type.name) ? readableType(context.get(type.name), context) : `${type.name}'`;
    case TYPE_ANY:
    	return "*";
    case TYPE_OR:
    	return `(${type.types.map(t => readableType(t, context)).join(" | ")})`;
    case TYPE_FUNCTION:
    	return `(${type.args.map(t => readableType(t, context)).join(" ")} -> ${readableType(type.res, context)})`;
    case TYPE_SCALAR:
    	return type.name;
  }
}

function replaceMorphs(type, morphs) {
	switch(type.type) {
    case TYPE_MISMATCH:
    	return type;
    case TYPE_MORPH:
    	return morphs.get(type.name, type);
    case TYPE_ANY:
    	return type;
    case TYPE_OR:
    	return {
      	...type,
        types: type.types.map(t => replaceMorphs(t, morphs))
      };
    case TYPE_FUNCTION:
      morphs = morphs.filter((_, name) => type.morphs.indexOf(name) < 0);
      return {
        ...type,
        args: type.args.map(t => replaceMorphs(t, morphs)),
        res: replaceMorphs(type.res, morphs)
      };
    case TYPE_SCALAR:
    	return type;
  }
}

/*function reify(type, context) {
	switch(type.type) {
  	case TYPE_MISMATCH:
    	return type;
    case TYPE_UNKNOWN:
    	return type;
    case TYPE_MORPH:
    	return context.get(type.name) ? reify(context.get(type.name), context) : scalar(type.name);
    case TYPE_ANY:
    	return type;
    case TYPE_OR:
    	return {
      	...type,
        types: type.types.map(t => reify(t, context))
      };
    case TYPE_FUNCTION:
      //context = context.filter((_, name) => type.morphs.indexOf(name) < 0);
      return {
        ...type,
        args: type.args.map(t => reify(t, context)),
        res: reify(type.res, context)
      };
    case TYPE_SCALAR:
    	return type;
  }
}*/

function castMorphToMorph(to, from, context) {
	if (to.name === from.name) {
  	return {
    	type: to,
      context: context
    };
  }
  else {
  	return castToMorph(to, from, context);
  }
}

function castToMorph(to, from, context) {
	if (!context.get(to.name)) {
  	return {
    	type: to,
      context: context.set(to.name, from)
    };
  }
  else {
  	return cast(context.get(to.name), from, context);
  }
}

function castFromMorph(to, from, context) {
	if (!context.get(from.name)) {
  	return {
    	type: to,
      context: context.set(from.name, to)
    };
  }
  else {
  	return cast(to, context.get(from.name), context);
  }
}

function castAnyToAny(to, from, context) {
	return {
   	type: to,
    context: context
  };
}

function castToAny(to, from, context) {
	return {
   	type: to,
    context: context
  };
}

function castFromAny(to, from, context) {
	return {
  	type: mismatch(to, from),
    context: context
  };
}

function castOrToOr(to, from, context) {
	return castFromOr(to, from, context);
}

function castToOr(to, from, context) {
	const prevContext = context;
  for(let _to of to.types) {
  	const { type, context: nextContext } = cast(_to, from, context);
    if (!isMismatched(type)) {
      return {
      	type: to,
        context: nextContext
      };
    }
  }
  return {
  	type: mismatch(to, from),
    context: prevContext
  };
}

function castFromOr(to, from, context) {
	const prevContext = context;
  for (let _from of from.types) {
  	const { type, context: nextContext } = cast(to, _from, context);
    if (isMismatched(type)) {
    	return {
  			type: mismatch(to, from),
    		context: prevContext
  		};
    }
    else {
    	context = nextContext;
    }
  }
  return {
  	type: to,
    context: context
  };
}

function tryCastFunctionArgs({ args: toArgs }, { args: fromArgs }, context) {
	for (let i = 0; i < toArgs.length; i++) {
		const toArg = toArgs[i];
		const fromArg = fromArgs[i];
    const { type, context: nextContext } = cast(fromArg, toArg, context);
    if (isMismatched(type)) {
    	return null;
    }
    else {
    	context = nextContext;
    }
  }
  return context;
}

function tryCastFunctionRes({ res: toRes }, { res: fromRes }, context) {
	const { type, context: nextContext } = cast(toRes, fromRes, context);
  if (isMismatched(type)) {
  	return null;
  }
	else {
		return nextContext;
	}
}

function replaceFunctionMorphs(fun, f) {
	if (!fun.morphs.length) {
  	return fun;
  }
  else {
  	const morphs = immutable.Map(
      fun.morphs.map(morphName => [morphName, f(morphName)]));
    return {
    	...fun,
      args: fun.args.map(t => replaceMorphs(t, morphs)),
      res: replaceMorphs(fun.res, morphs)
    };
  }
}

function castFunctionToFunction(to, from, context) {
	if (to.args.length !== from.args.length) {
  	return {
  		type: mismatch(to, from),
    	context: context
  	};
  }

  const prevTo = to;
  const prevFrom = from;
  const prevContext = context;

  to = replaceFunctionMorphs(to, uniqueMorph);
  from = replaceFunctionMorphs(from, uniqueMorph);

  context = tryCastFunctionArgs(to, from, context);
  if (!context) {
  	return {
  		type: mismatch(prevTo, prevFrom),
    	context: prevContext
  	};
  }

  context = tryCastFunctionRes(to, from, context);
  if (!context) {
  	return {
  		type: mismatch(prevTo, prevFrom),
    	context: prevContext
  	};
  }

  return {
  	type: prevTo,
    context: context
  };
}

function castScalarToScalar(to, from, context) {
	return {
  	type: to.name === from.name ? to : mismatch(to, from),
    context: context
  };
}

function cast(to, from, context) {
	if (to.type === TYPE_MISMATCH) {
  	return {
    	type: to,
      context: context
    };
  }
  else if (from.type === TYPE_MISMATCH) {
  	return {
    	type: from,
      context: context
    };
  }
  else if (to.type === TYPE_MORPH &&
  				 from.type === TYPE_MORPH) {
     return castMorphToMorph(to, from, context);
  }
  else if (to.type === TYPE_MORPH) {
     return castToMorph(to, from, context);
  }
  else if (from.type === TYPE_MORPH) {
     return castFromMorph(to, from, context);
  }
  else if (to.type === TYPE_ANY &&
  				 from.type === TYPE_ANY) {
  	return castAnyToAny(to, from, context);
  }
  else if (to.type === TYPE_ANY) {
  	return castToAny(to, from, context);
  }
  else if (from.type === TYPE_ANY) {
  	return castFromAny(to, from, context);
  }
  else if (to.type === TYPE_OR &&
  				 from.type === TYPE_OR) {
  	return castOrToOr(to, from, context);
  }
  else if (to.type === TYPE_OR) {
  	return castToOr(to, from, context);
  }
  else if (from.type === TYPE_OR) {
  	return castFromOr(to, from, context);
  }
  else if (to.type === TYPE_FUNCTION &&
  				 from.type === TYPE_FUNCTION) {
  	return castFunctionToFunction(to, from, context);
  }
  else if (to.type === TYPE_SCALAR &&
  				 from.type === TYPE_SCALAR) {
  	return castScalarToScalar(to, from, context);
  }
  else {
  	return {
    	type: mismatch(to, from),
      context: context
    };
  }
}

/* Check */

function define({ name, value, location }, context) {
  const defined = context.names.get(name);
  if (defined) {
    throw new CheckError(`Name already defined: ${name}`, location);
  }
  else {
    return {
      ...context,
      names: names.update(name, value)
    };
  }
}

function defined({ name, location }, context) {
  const type = context.names.get(name);
  if (!type) {
    throw new CheckError(`Name not defined: ${name}`, location);
  }
  else {
    return type;
  }
}

// TODO: check forall integrity
function checkType() {}

function checkUndefined(ast, context) {
  return {
    type: scalar("undefined"),
    context: context
  };
}

function checkNull(ast, context) {
  return {
    type: scalar("null"),
    context: context
  };
}

function checkFalse(ast, context) {
  return {
    type: scalar("false"),
    context: context
  };
}

function checkTrue(ast, context) {
  return {
    type: scalar("true"),
    context: context
  };
}

function checkNumber(ast, context) {
  return {
    type: scalar("number"),
    context: context
  };
}

function checkString(ast, context) {
  return {
    type: scalar("string"),
    context: context
  };
}

function checkName(ast, context) {
  return {
    type: defined(ast, context),
    context: context
  };
}

function checkCallCallee({ callee }, context) {
  return check(callee, context);
}

function checkCallArgs({ args }, context) {
  return args.reduce(
    ({ types, context }, arg) => {
      const { type, context: newContext } = check(arg, context);
      return {
        types: [...types, type],
        context: newContext
      };
    },
    {
      types: [],
      context: context
    });
}

function checkCallApplication(calleeType, argTypes, { location }, context) {
  const resType = uniqueMorph();
  const requiredCalleeType = fun([], argTypes, resType);
  const { type, context: types } = cast(requiredCalleeType, calleeType, context.types);
  if (isMismatched(type)) {
    throw CheckError(readableType(type), location);
  }
  else {
    return {
      type: resType,
      context: { ...newContext, types: types }
    };
  }
}

function checkCall(ast, context) {
  const { type: calleeType, context: calleeContext } = checkCallCallee(ast, context);
  const { types: argTypes, context: argsContext } = checkCallArgs(ast, calleeContext);
  return checkCallApplication(calleeType, argTypes, ast, argsContext);
}

function checkScope(ast, context) {

}

function checkFunction(ast, context) {
  //replaceFunctionMorphs(, uniqueScalar);
}

function check(ast, context) {
  switch (ast.type) {
    case "undefined": return checkUndefined(ast, context);
    case "null": return checkNull(ast, context);
    case "false": return checkFalse(ast, context);
    case "true": return checkTrue(ast, context);
    case "number": return checkNumber(ast, context);
    case "string": return checkString(ast, context);
    case "skip": return checkSkip(ast, context);
    case "name": return checkName(ast, context);
    case "list": return checkList(ast, context);
    case "map":  return checkMap(ast, context);
    case "lambda": return checkLambda(ast, context);
    case "monad": return checkMonad(ast, context);
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "call": return checkCall(ast, context);
    case "access": return checkAccess(ast, context);
    case "invoke": return checkInvoke(ast, context);
    case "module": return checkModule(ast, context);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  const context = {
    options: options || defaultOptions,
    types: immutable.Map(),
    names: immutable.Map()
  };
  return check(ast, context);
};
