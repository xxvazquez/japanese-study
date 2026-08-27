(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.FSRS = {})));
})(this, function(exports) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __defProp = Object.defineProperty;
	var __esmMin = (fn, res, err) => () => {
		if (err) throw err[0];
		try {
			return fn && (res = fn(fn = 0)), res;
		} catch (e) {
			throw err = [e], e;
		}
	};
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) {
			__defProp(target, name, {
				get: all[name],
				enumerable: true
			});
		}
		if (!no_symbols) {
			__defProp(target, Symbol.toStringTag, { value: "Module" });
		}
		return target;
	};

//#endregion

//#region \0@oxc-project+runtime@0.139.0/helpers/esm/typeof.js
	function _typeof(o) {
		"@babel/helpers - typeof";
		return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, _typeof(o);
	}
	var init_typeof = __esmMin((() => {}));

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/toPrimitive.js
	function toPrimitive(t, r) {
		if ("object" != _typeof(t) || !t) return t;
		var e = t[Symbol.toPrimitive];
		if (void 0 !== e) {
			var i = e.call(t, r || "default");
			if ("object" != _typeof(i)) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === r ? String : Number)(t);
	}
	var init_toPrimitive = __esmMin((() => {
		init_typeof();
	}));

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/toPropertyKey.js
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	var init_toPropertyKey = __esmMin((() => {
		init_typeof();
		init_toPrimitive();
	}));

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/defineProperty.js
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	var init_defineProperty = __esmMin((() => {
		init_toPropertyKey();
	}));

//#endregion
//#region ../srs-kit/dist/esm/schema-Cg0snmtp.js
	function isObject$1(value) {
		return !!value && !Array.isArray(value) && typeof value === "object";
	}
	function isFunction(fn) {
		return typeof fn === "function";
	}
	function assignObjectFields(target, source) {
		const fields = source;
		for (const key in fields) if (Object.hasOwn(fields, key)) target[key] = fields[key];
	}
	function isPromiseLike(value) {
		return "then" in value && typeof value.then === "function";
	}
	function validateSync(schema, input) {
		const result = schema["~standard"].validate(input);
		if (isPromiseLike(result)) {
			Promise.resolve(result).catch((error) => {
				console.error("Async Standard Schema validation rejected", error);
			});
			throw new TypeError("Async Standard Schema validation is not supported");
		}
		return result;
	}
	function defineSchema(validate) {
		return {
			"~standard": {
				version: 1,
				vendor: "@open-spaced-repetition/srs-kit",
				validate
			},
			parse(input) {
				const result = validate(input);
				if (result.issues) throw new SRSSchemaError(result.issues);
				return result.value;
			},
			safeParse(input) {
				const result = validate(input);
				if (result.issues) return {
					success: false,
					issues: result.issues
				};
				return {
					success: true,
					data: result.value
				};
			}
		};
	}
	function parse(schema, input) {
		const result = validateSync(schema, input);
		if (result.issues) throw new SRSSchemaError(result.issues);
		return result.value;
	}
	function isValidDate$1(value) {
		return value instanceof Date && value.getTime() !== 0 && Number.isFinite(value.getTime());
	}
	function createLazyIterable(keys, getValue) {
		return {
			map(callback) {
				return Array.from(this, (value) => callback(value));
			},
			[Symbol.iterator]() {
				let index = 0;
				const iterator = {
					next() {
						if (index >= keys.length) return {
							value: void 0,
							done: true
						};
						return {
							value: getValue(keys[index++]),
							done: false
						};
					},
					[Symbol.iterator]() {
						return iterator;
					}
				};
				return iterator;
			}
		};
	}
	function composeMiddleware(handlers, context, terminal) {
		if (handlers.length === 0) {
			terminal(context);
			return;
		}
		let index = -1;
		const dispatch = (nextIndex) => {
			if (nextIndex <= index) throw new Error("Middleware next() called multiple times");
			index = nextIndex;
			if (nextIndex >= handlers.length) {
				terminal(context);
				return;
			}
			const handler = handlers[nextIndex];
			if (!handler) {
				dispatch(nextIndex + 1);
				return;
			}
			handler(context, () => dispatch(nextIndex + 1));
		};
		dispatch(0);
	}
	var SRSSchemaError, emptyObjectSchema, numberSchema, dateSchema;
	var init_schema_Cg0snmtp = __esmMin((() => {
		init_defineProperty();
		SRSSchemaError = class SRSSchemaError extends Error {
			constructor(issues) {
				var _Error, _Error$captureStackTr;
				super(issues.map((issue) => issue.message).join("\n"));
				_defineProperty(this, "issues", void 0);
				this.name = "SRSSchemaError";
				this.issues = issues;
				(_Error = Error) === null || _Error === void 0 || (_Error$captureStackTr = _Error.captureStackTrace) === null || _Error$captureStackTr === void 0 || _Error$captureStackTr.call(_Error, this, SRSSchemaError);
			}
		};
		emptyObjectSchema = defineSchema((value) => {
			if (!isObject$1(value) || Object.keys(value).length > 0) return { issues: [{ message: "Expected empty object" }] };
			return { value: {} };
		});
		numberSchema = defineSchema((value) => typeof value === "number" && Number.isFinite(value) ? { value } : { issues: [{ message: "Expected finite number" }] });
		dateSchema = defineSchema((value) => isValidDate$1(value) ? { value } : { issues: [{ message: "Expected valid Date" }] });
	}));

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/objectSpread2.js
	function ownKeys(e, r) {
		var t = Object.keys(e);
		if (Object.getOwnPropertySymbols) {
			var o = Object.getOwnPropertySymbols(e);
			r && (o = o.filter(function(r) {
				return Object.getOwnPropertyDescriptor(e, r).enumerable;
			})), t.push.apply(t, o);
		}
		return t;
	}
	function _objectSpread2(e) {
		for (var r = 1; r < arguments.length; r++) {
			var t = null != arguments[r] ? arguments[r] : {};
			r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
				_defineProperty(e, r, t[r]);
			}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
				Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
			});
		}
		return e;
	}
	var init_objectSpread2 = __esmMin((() => {
		init_defineProperty();
	}));

//#endregion
//#region ../srs-kit/dist/esm/define-chrono-B71PK6Yo.js
	function defineChronoProjection(validate) {
		return defineSchema(validate);
	}
	function resolveChronoProjection(projection) {
		if (typeof projection === "function") return defineChronoProjection(projection);
		return projection;
	}
	function defineChrono(definition) {
		var _definition$defaultVa;
		return {
			schema: _objectSpread2(_objectSpread2(_objectSpread2({ time: definition.schema.time }, definition.schema.config ? { config: definition.schema.config } : {}), definition.schema.card ? { card: definition.schema.card } : {}), definition.schema.revlog ? { revlog: definition.schema.revlog } : {}),
			projection: resolveChronoProjection(definition.projection),
			defaultValue: (_definition$defaultVa = definition.defaultValue) !== null && _definition$defaultVa !== void 0 ? _definition$defaultVa : {},
			create: definition.create
		};
	}
	var init_define_chrono_B71PK6Yo = __esmMin((() => {
		init_schema_Cg0snmtp();
		init_objectSpread2();
	}));

//#endregion
//#region ../srs-kit/dist/esm/state-RShdT6C8.js
	var Rating, ratings, grades, ratingSchema, gradeSchema, State, states, stateSchema;
	var init_state_RShdT6C8 = __esmMin((() => {
		init_schema_Cg0snmtp();
		Rating = Object.freeze({
			Manual: 0,
			Again: 1,
			Hard: 2,
			Good: 3,
			Easy: 4
		});
		ratings = Object.freeze([
			Rating.Manual,
			Rating.Again,
			Rating.Hard,
			Rating.Good,
			Rating.Easy
		]);
		grades = Object.freeze([
			Rating.Again,
			Rating.Hard,
			Rating.Good,
			Rating.Easy
		]);
		ratingSchema = defineSchema((value) => value === Rating.Manual || value === Rating.Again || value === Rating.Hard || value === Rating.Good || value === Rating.Easy ? { value } : { issues: [{ message: "Expected rating" }] });
		gradeSchema = defineSchema((value) => value === Rating.Again || value === Rating.Hard || value === Rating.Good || value === Rating.Easy ? { value } : { issues: [{ message: "Expected grade" }] });
		State = Object.freeze({
			New: 0,
			Learning: 1,
			Review: 2,
			Relearning: 3
		});
		states = Object.freeze([
			State.New,
			State.Learning,
			State.Review,
			State.Relearning
		]);
		stateSchema = defineSchema((value) => value === State.New || value === State.Learning || value === State.Review || value === State.Relearning ? { value } : { issues: [{ message: "Expected state" }] });
	}));

//#endregion
//#region ../srs-kit/dist/esm/middleware-CDczamF7.js
	function defineMiddleware(definition) {
		return definition;
	}
	var statsConfigSchema, statsFieldsSchema, schedulerStatsMiddleware;
	var init_middleware_CDczamF7 = __esmMin((() => {
		init_schema_Cg0snmtp();
		init_state_RShdT6C8();
		statsConfigSchema = defineSchema((value) => {
			if (!isObject$1(value)) return { issues: [{ message: "Expected stats config object" }] };
			const { clearStatsOnForget } = value;
			if (clearStatsOnForget === void 0) return { value: { clearStatsOnForget: true } };
			if (typeof clearStatsOnForget !== "boolean") return { issues: [{ message: "Expected boolean clearStatsOnForget" }] };
			return { value: { clearStatsOnForget } };
		});
		statsFieldsSchema = defineSchema((value) => {
			if (!isObject$1(value)) return { issues: [{ message: "Expected stats object" }] };
			const { reps, lapses } = value;
			if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 0) return { issues: [{ message: "Expected non-negative integer reps" }] };
			if (typeof lapses !== "number" || !Number.isInteger(lapses) || lapses < 0) return { issues: [{ message: "Expected non-negative integer lapses" }] };
			return { value: {
				reps,
				lapses
			} };
		});
		schedulerStatsMiddleware = defineMiddleware({
			name: Symbol("srs-kit.stats"),
			schema: {
				config: statsConfigSchema,
				card: statsFieldsSchema
			},
			defaultValue: { card(ctx) {
				if (ctx.operation === "forget" && ctx.config.clearStatsOnForget === false) {
					const card = ctx.input;
					return {
						reps: card.reps,
						lapses: card.lapses
					};
				}
				return {
					reps: 0,
					lapses: 0
				};
			} },
			handlers: {
				review(ctx, next) {
					next();
					const card = ctx.input.card;
					const previousState = card.state;
					const previousLapses = card.lapses;
					const isLapse = ctx.input.grade === Rating.Again && previousState === State.Review;
					ctx.result.card.reps = card.reps + 1;
					ctx.result.card.lapses = isLapse ? previousLapses + 1 : previousLapses;
				},
				rollback(ctx, next) {
					next();
					const card = ctx.input.card;
					const revlog = ctx.input.revlog;
					const isLapse = revlog.rating === Rating.Again && revlog.state === State.Review;
					ctx.result.card.reps = Math.max(0, card.reps - 1);
					ctx.result.card.lapses = Math.max(0, card.lapses - (isLapse ? 1 : 0));
				}
			}
		});
	}));

//#endregion
//#region ../srs-kit/dist/esm/model/index.js
	function defineModel(definition) {
		return definition;
	}
	var init_model$5 = __esmMin((() => {}));

//#endregion
//#region ../srs-kit/dist/esm/status-DH1g9iw0.js
	var scheduleStatuses, scheduleStatusSchema;
	var init_status_DH1g9iw0 = __esmMin((() => {
		init_schema_Cg0snmtp();
		scheduleStatuses = Object.freeze([
			"new",
			"learning",
			"review"
		]);
		scheduleStatusSchema = defineSchema((value) => value === "new" || value === "learning" || value === "review" ? { value } : { issues: [{ message: "Expected schedule status" }] });
	}));

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/objectWithoutPropertiesLoose.js
	function _objectWithoutPropertiesLoose(r, e) {
		if (null == r) return {};
		var t = {};
		for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
			if (e.includes(n)) continue;
			t[n] = r[n];
		}
		return t;
	}
	var init_objectWithoutPropertiesLoose = __esmMin((() => {}));

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/objectWithoutProperties.js
	function _objectWithoutProperties(e, t) {
		if (null == e) return {};
		var o, r, i = _objectWithoutPropertiesLoose(e, t);
		if (Object.getOwnPropertySymbols) {
			var s = Object.getOwnPropertySymbols(e);
			for (r = 0; r < s.length; r++) o = s[r], t.includes(o) || {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
		}
		return i;
	}
	var init_objectWithoutProperties = __esmMin((() => {
		init_objectWithoutPropertiesLoose();
	}));

//#endregion
//#region ../srs-kit/dist/esm/scheduler-Bx8PjBjh.js
	function getAttachedValue(target, key) {
		return target[key];
	}
	function rememberAttachedValue(target, key, value) {
		Object.defineProperty(target, key, {
			value,
			writable: false,
			enumerable: false,
			configurable: false
		});
		return target;
	}
	function composeSchema(ctx) {
		const { model, chrono, middlewares } = ctx;
		const modelConfigSchema = model.schema.config;
		const chronoSchema = chrono.schema;
		const chronoConfigSchema = chronoSchema.config;
		const chronoCardSchema = chronoSchema.card;
		const chronoRevlogSchema = chronoSchema.revlog;
		const middlewareConfigSchemas = [];
		const middlewareCardInitInputSchemas = [];
		const middlewareCardSchemas = [];
		const middlewareRevlogSchemas = [];
		for (const middleware of middlewares) {
			const schema = middleware.schema;
			if (!schema) continue;
			if (schema.config) middlewareConfigSchemas.push(schema.config);
			if (schema.cardInitInput) middlewareCardInitInputSchemas.push(schema.cardInitInput);
			if (schema.card) middlewareCardSchemas.push(schema.card);
			if (schema.revlog) middlewareRevlogSchemas.push(schema.revlog);
		}
		const scheduleStatusSchema = defineSchema((value) => {
			if (typeof value !== "string") return { issues: [{ message: "Expected scheduleStatus string" }] };
			let isKnownStatus = scheduleStatuses.includes(value);
			for (const middleware of middlewares) {
				var _middleware$scheduleS;
				if (isKnownStatus) break;
				isKnownStatus = ((_middleware$scheduleS = middleware.scheduleStatus) === null || _middleware$scheduleS === void 0 ? void 0 : _middleware$scheduleS.includes(value)) === true;
			}
			if (!isKnownStatus) return { issues: [{ message: "Expected known scheduleStatus" }] };
			return { value };
		});
		const parseCoreFields = (fields, options) => {
			const scheduleStatus = validateSync(scheduleStatusSchema, fields.scheduleStatus);
			if (scheduleStatus.issues) return scheduleStatus;
			const state = validateSync(stateSchema, fields.state);
			if (state.issues) return state;
			if (!(options === null || options === void 0 ? void 0 : options.rating)) return { value: {
				state: state.value,
				scheduleStatus: scheduleStatus.value
			} };
			const rating = validateSync(gradeSchema, fields.rating);
			if (rating.issues) return rating;
			return { value: {
				state: state.value,
				scheduleStatus: scheduleStatus.value,
				rating: rating.value
			} };
		};
		return {
			config: defineSchema((value) => {
				if (!isObject$1(value)) return { issues: [{ message: "Expected scheduler config object" }] };
				const modelResult = validateSync(modelConfigSchema, value);
				if (modelResult.issues) return modelResult;
				let chronoValue = {};
				if (chronoConfigSchema) {
					const chronoResult = validateSync(chronoConfigSchema, value.chrono);
					if (chronoResult.issues) return chronoResult;
					chronoValue = chronoResult.value;
				}
				const result = { chrono: chronoValue };
				assignObjectFields(result, modelResult.value);
				for (const schema of middlewareConfigSchemas) {
					const middlewareResult = validateSync(schema, value);
					if (middlewareResult.issues) return middlewareResult;
					assignObjectFields(result, middlewareResult.value);
				}
				return { value: rememberAttachedValue(result, parsedModelConfigSymbol, modelResult.value) };
			}),
			cardInitInput: defineSchema((value) => {
				var _ref, _combinedFields2;
				if (!isObject$1(value)) return { issues: [{ message: "Expected card init input object" }] };
				const { now } = value, middlewareValue = _objectWithoutProperties(value, _excluded);
				let firstMiddlewareFields;
				let combinedFields;
				for (const schema of middlewareCardInitInputSchemas) {
					var _combinedFields;
					const middlewareResult = validateSync(schema, middlewareValue);
					if (middlewareResult.issues) return middlewareResult;
					const fields = middlewareResult.value;
					if (firstMiddlewareFields === void 0) {
						firstMiddlewareFields = fields;
						continue;
					}
					(_combinedFields = combinedFields) !== null && _combinedFields !== void 0 || (combinedFields = Object.assign({}, firstMiddlewareFields));
					assignObjectFields(combinedFields, fields);
				}
				return { value: {
					input: (_ref = (_combinedFields2 = combinedFields) !== null && _combinedFields2 !== void 0 ? _combinedFields2 : firstMiddlewareFields) !== null && _ref !== void 0 ? _ref : {},
					now
				} };
			}),
			card: defineSchema((value) => {
				if (!isObject$1(value)) return { issues: [{ message: "Expected card object" }] };
				const modelResult = validateSync(model.schema.memoryState, value);
				if (modelResult.issues) return modelResult;
				const memoryState = modelResult.value;
				const card = Object.assign({}, memoryState);
				if (chronoCardSchema) {
					const chronoCard = validateSync(chronoCardSchema, value);
					if (chronoCard.issues) return chronoCard;
					Object.assign(card, chronoCard.value);
				}
				const coreFields = parseCoreFields(value);
				if (coreFields.issues) return coreFields;
				card.state = coreFields.value.state;
				card.scheduleStatus = coreFields.value.scheduleStatus;
				for (const schema of middlewareCardSchemas) {
					const middlewareCard = validateSync(schema, value);
					if (middlewareCard.issues) return middlewareCard;
					Object.assign(card, middlewareCard.value);
				}
				return { value: rememberAttachedValue(card, parsedCardMemoryStateSymbol, memoryState) };
			}),
			revlog: defineSchema((value) => {
				if (!isObject$1(value)) return { issues: [{ message: "Expected revlog object" }] };
				const modelResult = validateSync(model.schema.memoryState, value);
				if (modelResult.issues) return modelResult;
				const result = modelResult.value;
				if (chronoRevlogSchema) {
					const chronoRevlog = validateSync(chronoRevlogSchema, value);
					if (chronoRevlog.issues) return chronoRevlog;
					Object.assign(result, chronoRevlog.value);
				}
				const coreFields = parseCoreFields(value, { rating: true });
				if (coreFields.issues) return coreFields;
				result.scheduleStatus = coreFields.value.scheduleStatus;
				result.rating = coreFields.value.rating;
				result.state = coreFields.value.state;
				for (const schema of middlewareRevlogSchemas) {
					const middlewareRevlog = validateSync(schema, value);
					if (middlewareRevlog.issues) return middlewareRevlog;
					Object.assign(result, middlewareRevlog.value);
				}
				return { value: result };
			}),
			scheduleStatus: scheduleStatusSchema
		};
	}
	function applyMiddlewareCardDefaults(target, middlewares, ctx) {
		for (const middleware of middlewares) {
			var _middleware$defaultVa;
			const defaultValue = (_middleware$defaultVa = middleware.defaultValue) === null || _middleware$defaultVa === void 0 ? void 0 : _middleware$defaultVa.card;
			if (isFunction(defaultValue)) Object.assign(target, defaultValue(ctx));
		}
	}
	function resolveChronoDefault(value) {
		return isFunction(value) ? value : void 0;
	}
	function applyNewCardDefaults(ctx) {
		const { target, defaultValue, middlewares, chronoDefault, time } = ctx;
		if (chronoDefault) Object.assign(target, chronoDefault({
			config: defaultValue.config.chrono,
			time
		}));
		applyMiddlewareCardDefaults(target, middlewares, defaultValue);
	}
	function useComposeDefaultValue(ctx) {
		var _chrono$defaultValue;
		const { model, chrono, middlewares } = ctx;
		const chronoCardDefault = resolveChronoDefault((_chrono$defaultValue = chrono.defaultValue) === null || _chrono$defaultValue === void 0 ? void 0 : _chrono$defaultValue.card);
		return { newCard(defaultValue, time) {
			const { config } = defaultValue;
			const card = model.defaultValue.memoryState({ config });
			card.state = State.New;
			card.scheduleStatus = "new";
			applyNewCardDefaults({
				target: card,
				defaultValue,
				middlewares,
				chronoDefault: chronoCardDefault,
				time
			});
			return card;
		} };
	}
	function flattenMiddlewares(node) {
		if (!node) return emptyMiddlewares;
		const middlewares = new Array(node.length);
		let index = node.length;
		for (let current = node; current; current = current.parent) middlewares[--index] = current.middleware;
		return middlewares;
	}
	function defineScheduler(definition) {
		const { model, chrono } = definition;
		function build(node) {
			let middlewares;
			let defaultValue;
			let schedulerSchema;
			let compositionReady = false;
			const getMiddlewares = () => {
				var _middlewares;
				(_middlewares = middlewares) !== null && _middlewares !== void 0 || (middlewares = flattenMiddlewares(node));
				return middlewares;
			};
			const scheduler = {
				name: model.name,
				modelDef: model,
				chronoDef: chrono,
				get defaultValue() {
					var _defaultValue;
					(_defaultValue = defaultValue) !== null && _defaultValue !== void 0 || (defaultValue = useComposeDefaultValue({
						model,
						chrono,
						middlewares: getMiddlewares()
					}));
					return defaultValue;
				},
				get schema() {
					var _schedulerSchema;
					(_schedulerSchema = schedulerSchema) !== null && _schedulerSchema !== void 0 || (schedulerSchema = composeSchema({
						model,
						chrono,
						middlewares: getMiddlewares()
					}));
					return schedulerSchema;
				},
				create(ctx) {
					if (!compositionReady) {
						schedulerSchema = scheduler.schema;
						defaultValue = scheduler.defaultValue;
						compositionReady = true;
					}
					return new BaseScheduler({
						model,
						chrono,
						schema: schedulerSchema,
						defaultValue,
						middlewares,
						config: ctx.config
					});
				},
				use(...added) {
					var _node$length;
					if (added.length === 0) return scheduler;
					let child = node;
					let length = (_node$length = node === null || node === void 0 ? void 0 : node.length) !== null && _node$length !== void 0 ? _node$length : 0;
					for (const middleware of added) child = {
						parent: child,
						middleware,
						length: ++length
					};
					return build(child);
				}
			};
			return scheduler;
		}
		return build();
	}
	var _excluded, parsedModelConfigSymbol, parsedCardMemoryStateSymbol, DEFAULT_DESIRED_RETENTION, FORWARD_PREPARE_OPTIONS, ReviewInput, BaseScheduler, emptyMiddlewares;
	var init_scheduler_Bx8PjBjh = __esmMin((() => {
		init_schema_Cg0snmtp();
		init_state_RShdT6C8();
		init_status_DH1g9iw0();
		init_objectWithoutProperties();
		init_defineProperty();
		_excluded = ["now"];
		parsedModelConfigSymbol = Symbol("parsedModelConfig");
		parsedCardMemoryStateSymbol = Symbol("parsedCardMemoryState");
		DEFAULT_DESIRED_RETENTION = .9;
		FORWARD_PREPARE_OPTIONS = { freezeCard: false };
		ReviewInput = class {
			constructor(input) {
				_defineProperty(this, "input", void 0);
				this.input = input;
			}
			get card() {
				return this.input.card;
			}
			set card(_value) {
				throw new Error("Review input card cannot be changed");
			}
			get grade() {
				return this.input.grade;
			}
			set grade(_value) {
				throw new Error("Review input grade cannot be changed");
			}
			get now() {
				return this.input.now;
			}
			set now(_value) {
				throw new Error("Review input now cannot be changed");
			}
		};
		BaseScheduler = class {
			constructor(ctx) {
				_defineProperty(this, "config", void 0);
				_defineProperty(this, "model", void 0);
				_defineProperty(this, "chrono", void 0);
				_defineProperty(this, "schedulerDefinition", void 0);
				_defineProperty(this, "defaultValue", void 0);
				_defineProperty(this, "schema", void 0);
				_defineProperty(this, "reviewHandlers", void 0);
				_defineProperty(this, "rollbackHandlers", void 0);
				_defineProperty(this, "newCard", (options) => {
					const { now, input } = parse(this.schema.cardInitInput, options === void 0 ? {} : options);
					return this.defaultValue.newCard({
						operation: "newCard",
						config: this.config,
						input
					}, this.parseNow(now));
				});
				_defineProperty(
					this,
					/**
					* Replays a review history and returns the card and revlog produced by each
					* review.
					*
					* The history is consumed as given: it must already be sorted by review time
					* and must not contain manual ratings.
					*/
					"forward",
					(input) => {
						const { history } = input;
						if (history.length === 0) return [];
						const results = new Array(history.length);
						const initialCard = input.initialCard == null ? this.newCard({ now: history[0].reviewTime }) : input.initialCard;
						let card = parse(this.schema.card, initialCard);
						for (let index = 0; index < history.length; index++) {
							const review = history[index];
							const now = review.reviewTime;
							const prepared = this.prepareParsedReview(card, now, FORWARD_PREPARE_OPTIONS);
							const result = this.parseReviewResult(this.runReview(prepared, review.rating, now));
							results[index] = result;
							card = result.card;
						}
						return results;
					}
				);
				_defineProperty(this, "forget", (input) => {
					const card = parse(this.schema.card, input.card);
					const now = this.parseNow(input.now);
					return this.defaultValue.newCard({
						operation: "forget",
						config: this.config,
						input: card
					}, now);
				});
				_defineProperty(this, "review", (input) => {
					const { card: inputCard, grade: inputGrade } = input;
					const grade = parse(gradeSchema, inputGrade);
					const now = this.parseNow(input.now);
					const prepared = this.prepareReview(inputCard, now);
					return this.parseReviewResult(this.runReview(prepared, grade, now));
				});
				_defineProperty(this, "preview", (input) => {
					const inputCard = input.card;
					const now = this.parseNow(input.now);
					const prepared = this.prepareReview(inputCard, now);
					return createLazyIterable(grades, (grade) => {
						const { card, revlog } = this.parseReviewResult(this.runReview(prepared, grade, now));
						return {
							grade,
							card,
							revlog
						};
					});
				});
				_defineProperty(this, "rollback", (input) => {
					const { card: inputCard, revlog: inputRevlog } = input;
					const revlog = parse(this.schema.revlog, inputRevlog);
					const card = parse(this.schema.card, inputCard);
					const ctx = {
						config: this.config,
						input: {
							card: Object.freeze(card),
							revlog: Object.freeze(revlog)
						},
						result: { card: {} }
					};
					composeMiddleware(this.rollbackHandlers, ctx, (ctx) => this.finalizeRollback(ctx));
					this.applyRollbackChronoDefaults(ctx.result, revlog);
					return parse(this.schema.card, ctx.result.card);
				});
				const { model, chrono, schema, defaultValue, middlewares = [] } = ctx;
				this.schedulerDefinition = Object.freeze({
					model,
					chrono
				});
				this.schema = schema;
				this.defaultValue = defaultValue;
				const config = parse(schema.config, ctx.config);
				this.config = config;
				this.model = model.create({
					config: getAttachedValue(config, parsedModelConfigSymbol),
					bypass: true
				});
				this.chrono = Reflect.apply(chrono.create, chrono, [{ config: config.chrono }]);
				this.reviewHandlers = middlewares.map((middleware) => {
					var _middleware$handlers;
					return (_middleware$handlers = middleware.handlers) === null || _middleware$handlers === void 0 ? void 0 : _middleware$handlers.review;
				});
				this.rollbackHandlers = middlewares.map((middleware) => {
					var _middleware$handlers2;
					return (_middleware$handlers2 = middleware.handlers) === null || _middleware$handlers2 === void 0 ? void 0 : _middleware$handlers2.rollback;
				});
			}
			get definition() {
				return this.schedulerDefinition;
			}
			prepareReview(inputCard, now) {
				const parsedCard = parse(this.schema.card, inputCard);
				return this.prepareParsedReview(parsedCard, now);
			}
			prepareParsedReview(parsedCard, now, { freezeCard = true } = {}) {
				const memoryState = getAttachedValue(parsedCard, parsedCardMemoryStateSymbol);
				if (!memoryState) throw new Error("Parsed scheduler card is missing model memory state");
				const card = freezeCard ? Object.freeze(parsedCard) : parsedCard;
				const time = parse(this.schedulerDefinition.chrono.projection, {
					card,
					time: now
				});
				const elapsedDays = card.state === State.New ? 0 : this.chrono.difference(time.previous, time.current);
				const retrievability = this.model.forgettingCurve(memoryState, elapsedDays);
				const memoryStateByGrade = /* @__PURE__ */ new Map();
				const gradeByMemoryState = /* @__PURE__ */ new Map();
				const step = (grade) => {
					let nextMemoryState = memoryStateByGrade.get(grade);
					if (nextMemoryState === void 0) {
						nextMemoryState = this.model.step({
							memoryState,
							rating: grade,
							elapsedDays,
							retrievability
						});
						memoryStateByGrade.set(grade, nextMemoryState);
					}
					gradeByMemoryState.set(nextMemoryState, grade);
					return nextMemoryState;
				};
				const findGrade = (nextMemoryState) => gradeByMemoryState.get(nextMemoryState);
				const intervalCache = /* @__PURE__ */ new Map();
				const nextInterval = (nextMemoryState, desiredRetention) => {
					let inner = intervalCache.get(nextMemoryState);
					if (inner) {
						const cached = inner.get(desiredRetention);
						if (cached !== void 0) return cached;
					} else {
						inner = /* @__PURE__ */ new Map();
						intervalCache.set(nextMemoryState, inner);
					}
					const value = this.model.nextInterval(nextMemoryState, desiredRetention);
					inner.set(desiredRetention, value);
					return value;
				};
				return {
					card,
					time,
					elapsedDays,
					memoryState,
					retrievability,
					candidate: {
						step,
						findGrade,
						nextInterval
					}
				};
			}
			runReview(prepared, grade, now) {
				const ctx = {
					config: this.config,
					input: new ReviewInput({
						card: prepared.card,
						grade,
						now
					}),
					desiredRetention: DEFAULT_DESIRED_RETENTION,
					elapsedDays: prepared.elapsedDays,
					scheduledDays: void 0,
					candidate: prepared.candidate,
					result: {
						card: {},
						revlog: {}
					}
				};
				composeMiddleware(this.reviewHandlers, ctx, (ctx) => this.finalizeReview(prepared, ctx));
				this.applyReviewChronoDefaults(prepared, ctx);
				return ctx.result;
			}
			parseReviewResult(result) {
				return {
					card: parse(this.schema.card, result.card),
					revlog: parse(this.schema.revlog, result.revlog)
				};
			}
			finalizeReview(prepared, ctx) {
				var _ctx$scheduledDays;
				const { memoryState } = prepared;
				const { grade } = ctx.input;
				const result = ctx.result;
				const newMemoryState = ctx.candidate.step(grade);
				(_ctx$scheduledDays = ctx.scheduledDays) !== null && _ctx$scheduledDays !== void 0 || (ctx.scheduledDays = ctx.candidate.nextInterval(newMemoryState, ctx.desiredRetention));
				Object.assign(result.card, newMemoryState, {
					state: State.Review,
					scheduleStatus: "review"
				});
				Object.assign(result.revlog, memoryState, {
					rating: grade,
					state: prepared.card.state,
					scheduleStatus: prepared.card.scheduleStatus
				});
				return result;
			}
			finalizeRollback(ctx) {
				const result = ctx.result;
				const revlog = ctx.input.revlog;
				Object.assign(result.card, parse(this.schedulerDefinition.model.schema.memoryState, revlog));
				result.card.state = revlog.state;
				result.card.scheduleStatus = revlog.scheduleStatus;
				return result.card;
			}
			applyReviewChronoDefaults(prepared, ctx) {
				if (ctx.scheduledDays === void 0) throw new Error("Expected scheduledDays after review middleware");
				this.applyChronoDefaults(ctx.result, prepared, ctx.scheduledDays);
			}
			applyChronoDefaults(result, prepared, scheduledDays) {
				var _this$schedulerDefini, _this$schedulerDefini2;
				const chronoCardDefault = (_this$schedulerDefini = this.schedulerDefinition.chrono.defaultValue) === null || _this$schedulerDefini === void 0 ? void 0 : _this$schedulerDefini.card;
				if (chronoCardDefault) Object.assign(result.card, chronoCardDefault({
					config: this.config.chrono,
					time: this.chrono.add(prepared.time.current, scheduledDays),
					previous: prepared.time
				}));
				const chronoRevlogDefault = (_this$schedulerDefini2 = this.schedulerDefinition.chrono.defaultValue) === null || _this$schedulerDefini2 === void 0 ? void 0 : _this$schedulerDefini2.revlog;
				if (chronoRevlogDefault) Object.assign(result.revlog, chronoRevlogDefault({
					config: this.config.chrono,
					time: prepared.time.current,
					previous: prepared.time
				}));
			}
			applyRollbackChronoDefaults(result, revlog) {
				var _this$schedulerDefini3, _this$schedulerDefini4;
				if (!this.schedulerDefinition.chrono.schema.card) return;
				const projection = parse(this.schedulerDefinition.chrono.projection, { revlog });
				const isNew = revlog.state === State.New;
				const cardFields = (_this$schedulerDefini3 = this.schedulerDefinition.chrono.defaultValue) === null || _this$schedulerDefini3 === void 0 || (_this$schedulerDefini4 = _this$schedulerDefini3.card) === null || _this$schedulerDefini4 === void 0 ? void 0 : _this$schedulerDefini4.call(_this$schedulerDefini3, {
					config: this.config.chrono,
					previous: isNew ? void 0 : {
						previous: 0,
						current: projection.previous
					},
					time: isNew ? projection.previous : projection.current
				});
				if (cardFields) Object.assign(result.card, cardFields);
			}
			parseNow(now) {
				return now === void 0 ? this.chrono.now() : parse(this.schedulerDefinition.chrono.schema.time, now);
			}
		};
		emptyMiddlewares = [];
	}));

//#endregion
//#region ../srs-kit/dist/esm/index.js
	var init_esm = __esmMin((() => {
		init_schema_Cg0snmtp();
		init_middleware_CDczamF7();
		init_state_RShdT6C8();
		init_model$5();
		init_scheduler_Bx8PjBjh();
	}));

//#endregion
//#region ../srs-kit/dist/esm/chrono/date/index.js
init_esm();
	init_schema_Cg0snmtp();
	init_define_chrono_B71PK6Yo();
	const MS_PER_DAY$1 = 864e5;
	function isValidDate(value) {
		return dateSchema.safeParse(value).success;
	}
	function invalidDateFields() {
		return { issues: [{ message: "Expected valid Date fields" }] };
	}
	const dateCardFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value) || !("dueAt" in value)) return invalidDateFields();
		const { dueAt, lastReviewAt } = value;
		if (!isValidDate(dueAt)) return invalidDateFields();
		if (lastReviewAt !== void 0 && lastReviewAt !== null && !isValidDate(lastReviewAt)) return invalidDateFields();
		return { value: {
			dueAt,
			lastReviewAt: lastReviewAt !== void 0 ? lastReviewAt : null
		} };
	});
	const dateRevlogFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value) || !("dueAt" in value) || !("reviewTime" in value)) return invalidDateFields();
		const { dueAt, reviewTime } = value;
		if (!isValidDate(dueAt) || !isValidDate(reviewTime)) return invalidDateFields();
		return { value: {
			dueAt,
			reviewTime
		} };
	});
	const dateChrono = defineChrono({
		schema: {
			card: dateCardFieldsSchema,
			revlog: dateRevlogFieldsSchema,
			time: dateSchema
		},
		projection(value) {
			if (!isObject$1(value)) return { issues: [{ message: "Expected valid Date fields" }] };
			if ("card" in value) {
				var _card$value$lastRevie;
				const card = dateCardFieldsSchema["~standard"].validate(value.card);
				if (card.issues) return card;
				const time = dateSchema["~standard"].validate(value.time);
				if (time.issues) return time;
				return { value: {
					previous: (_card$value$lastRevie = card.value.lastReviewAt) !== null && _card$value$lastRevie !== void 0 ? _card$value$lastRevie : card.value.dueAt,
					current: time.value
				} };
			}
			const revlog = dateRevlogFieldsSchema["~standard"].validate(value.revlog);
			if (revlog.issues) return revlog;
			return { value: {
				previous: revlog.value.dueAt,
				current: revlog.value.reviewTime
			} };
		},
		defaultValue: {
			card({ previous, time }) {
				var _previous$current;
				return {
					dueAt: time,
					lastReviewAt: (_previous$current = previous === null || previous === void 0 ? void 0 : previous.current) !== null && _previous$current !== void 0 ? _previous$current : null
				};
			},
			revlog({ time, previous }) {
				var _previous$previous, _previous$current2;
				return {
					dueAt: (_previous$previous = previous === null || previous === void 0 ? void 0 : previous.previous) !== null && _previous$previous !== void 0 ? _previous$previous : time,
					reviewTime: (_previous$current2 = previous === null || previous === void 0 ? void 0 : previous.current) !== null && _previous$current2 !== void 0 ? _previous$current2 : time
				};
			}
		},
		create() {
			return {
				now: now$2,
				compare: compare$1,
				difference: difference$1,
				add: add$1
			};
		}
	});
	const now$2 = () => /* @__PURE__ */ new Date();
	const compare$1 = (left, right) => {
		const leftTime = left.getTime();
		const rightTime = right.getTime();
		return leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
	};
	const difference$1 = (from, to) => dateDiffInDays$1(from, to);
	const add$1 = (from, days) => new Date(from.getTime() + days * MS_PER_DAY$1);
	function dateDiffInDays$1(last, cur) {
		const utc1 = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
		const utc2 = Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate());
		return Math.floor((utc2 - utc1) / MS_PER_DAY$1);
	}

//#endregion
//#region ../srs-kit/dist/esm/chrono/numeric/index.js
	init_schema_Cg0snmtp();
	init_define_chrono_B71PK6Yo();
	const numericProjectionSchema = defineChronoProjection((value) => {
		const time = numberSchema["~standard"].validate(value.time);
		if (time.issues) return time;
		return { value: {
			previous: 0,
			current: time.value
		} };
	});
	const numericChrono = defineChrono({
		schema: { time: numberSchema },
		projection: numericProjectionSchema,
		create() {
			return {
				now: now$1,
				difference,
				add
			};
		}
	});
	const now$1 = () => 0;
	const difference = (from, to) => to - from;
	const add = (from, days) => from + days;

//#endregion
//#region ../srs-kit/dist/esm/chrono/temporal-instant/index.js
	init_schema_Cg0snmtp();
	init_define_chrono_B71PK6Yo();
	function getTemporalInstantConstructor() {
		const temporal = globalThis.Temporal;
		if ((temporal === null || temporal === void 0 ? void 0 : temporal.Instant) === void 0) throw new ReferenceError("Temporal.Instant is not available in this runtime. Install a Temporal polyfill or upgrade to Node.js 26+ for native Temporal support. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal#browser_compatibility");
		return temporal.Instant;
	}
	const UTC_OFFSET_RE = /^[+-](?:[01]\d|2[0-3]):[0-5]\d$/;
	function parseTimeZoneId(timezone) {
		if (timezone === "UTC" || UTC_OFFSET_RE.test(timezone)) return timezone;
		try {
			return getTemporalInstantConstructor().fromEpochNanoseconds(0n).toZonedDateTimeISO(timezone).timeZoneId;
		} catch (_unused) {
			return;
		}
	}
	const temporalInstantConfigSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected temporal instant config" }] };
		const timezone = value.timezone === void 0 ? "UTC" : value.timezone;
		if (typeof timezone !== "string") return { issues: [{ message: "Expected timezone to be a string" }] };
		const timezoneId = parseTimeZoneId(timezone);
		if (timezoneId === void 0) return { issues: [{ message: "Expected valid timezone" }] };
		const fractionalDays = value.fractionalDays === void 0 ? false : value.fractionalDays;
		if (typeof fractionalDays !== "boolean") return { issues: [{ message: "Expected fractionalDays to be a boolean" }] };
		return { value: {
			timezone: timezoneId,
			fractionalDays
		} };
	});
	const temporalInstantSchema = defineSchema((value) => {
		return value instanceof getTemporalInstantConstructor() ? { value } : { issues: [{ message: "Expected Temporal.Instant" }] };
	});
	function invalidInstantFields() {
		return { issues: [{ message: "Expected Temporal.Instant fields" }] };
	}
	const temporalInstantCardFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value) || !("dueAt" in value)) return invalidInstantFields();
		const dueAt = temporalInstantSchema.safeParse(value.dueAt);
		if (!dueAt.success) return invalidInstantFields();
		if (value.lastReviewAt === void 0 || value.lastReviewAt === null) return { value: {
			dueAt: dueAt.data,
			lastReviewAt: null
		} };
		const lastReviewAt = temporalInstantSchema.safeParse(value.lastReviewAt);
		if (!lastReviewAt.success) return invalidInstantFields();
		return { value: {
			dueAt: dueAt.data,
			lastReviewAt: lastReviewAt.data
		} };
	});
	const temporalInstantRevlogFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value) || !("dueAt" in value) || !("reviewTime" in value)) return invalidInstantFields();
		const dueAt = temporalInstantSchema.safeParse(value.dueAt);
		if (!dueAt.success) return invalidInstantFields();
		const reviewTime = temporalInstantSchema.safeParse(value.reviewTime);
		if (!reviewTime.success) return invalidInstantFields();
		return { value: {
			dueAt: dueAt.data,
			reviewTime: reviewTime.data
		} };
	});
	const MS_PER_DAY = 864e5;
	function utcDateDifferenceInDays(from, to) {
		const fromDate = from.toZonedDateTimeISO("UTC").toPlainDate();
		const toDate = to.toZonedDateTimeISO("UTC").toPlainDate();
		return fromDate.until(toDate, { largestUnit: "day" }).days;
	}
	function addFixedUtcDays(from, days) {
		return from.add({ milliseconds: Math.round(days * MS_PER_DAY) });
	}
	const NS_PER_MS = 1000000n;
	const differenceByMode = {
		fractional: fractionalZonedDifferenceInDays,
		utc: utcDateDifferenceInDays,
		zoned: zonedDateDifferenceInDays
	};
	const addByMode = {
		utc: addFixedUtcDays,
		zoned: addZonedCalendarDays
	};
	const temporalInstantChrono = defineChrono({
		schema: {
			config: temporalInstantConfigSchema,
			card: temporalInstantCardFieldsSchema,
			revlog: temporalInstantRevlogFieldsSchema,
			time: temporalInstantSchema
		},
		projection(value) {
			if (!isObject$1(value)) return { issues: [{ message: "Expected Temporal.Instant fields" }] };
			if ("card" in value) {
				var _card$value$lastRevie;
				const card = temporalInstantCardFieldsSchema["~standard"].validate(value.card);
				if (card.issues) return card;
				const time = temporalInstantSchema["~standard"].validate(value.time);
				if (time.issues) return time;
				return { value: {
					previous: (_card$value$lastRevie = card.value.lastReviewAt) !== null && _card$value$lastRevie !== void 0 ? _card$value$lastRevie : card.value.dueAt,
					current: time.value
				} };
			}
			const revlog = temporalInstantRevlogFieldsSchema["~standard"].validate(value.revlog);
			if (revlog.issues) return revlog;
			return { value: {
				previous: revlog.value.dueAt,
				current: revlog.value.reviewTime
			} };
		},
		defaultValue: {
			card({ previous, time }) {
				var _previous$current;
				return {
					dueAt: time,
					lastReviewAt: (_previous$current = previous === null || previous === void 0 ? void 0 : previous.current) !== null && _previous$current !== void 0 ? _previous$current : null
				};
			},
			revlog({ time, previous }) {
				var _previous$previous, _previous$current2;
				return {
					dueAt: (_previous$previous = previous === null || previous === void 0 ? void 0 : previous.previous) !== null && _previous$previous !== void 0 ? _previous$previous : time,
					reviewTime: (_previous$current2 = previous === null || previous === void 0 ? void 0 : previous.current) !== null && _previous$current2 !== void 0 ? _previous$current2 : time
				};
			}
		},
		create({ config }) {
			getTemporalInstantConstructor();
			const { fractionalDays, timezone } = config;
			const addMode = timezone === "UTC" ? "utc" : "zoned";
			const differenceMode = fractionalDays ? "fractional" : addMode;
			return {
				now,
				compare,
				difference: (from, to) => differenceByMode[differenceMode](from, to, timezone),
				add: (from, days) => addByMode[addMode](from, days, timezone)
			};
		}
	});
	const now = () => Temporal.Now.instant();
	function compare(left, right) {
		if (left.epochNanoseconds < right.epochNanoseconds) return -1;
		if (left.epochNanoseconds > right.epochNanoseconds) return 1;
		return 0;
	}
	function zonedDateDifferenceInDays(from, to, timezone) {
		const fromDate = from.toZonedDateTimeISO(timezone).toPlainDate();
		const toDate = to.toZonedDateTimeISO(timezone).toPlainDate();
		return fromDate.until(toDate, { largestUnit: "day" }).days;
	}
	function fractionalZonedDifferenceInDays(from, to, timezone) {
		const fromZoned = from.toZonedDateTimeISO(timezone);
		const toZoned = to.toZonedDateTimeISO(timezone);
		return fromZoned.until(toZoned, {
			largestUnit: "day",
			smallestUnit: "nanosecond"
		}).total({
			unit: "day",
			relativeTo: fromZoned
		});
	}
	function addZonedCalendarDays(from, days, timezone) {
		const whole = Math.trunc(days);
		const fraction = days - whole;
		const shifted = from.toZonedDateTimeISO(timezone).add({ days: whole });
		if (fraction === 0) return shifted.toInstant();
		const neighbor = shifted.add({ days: fraction > 0 ? 1 : -1 });
		const dayLengthMs = Math.abs(Number((neighbor.epochNanoseconds - shifted.epochNanoseconds) / NS_PER_MS));
		const milliseconds = Math.round(Math.abs(fraction) * dayLengthMs) * Math.sign(fraction);
		return shifted.add({ milliseconds }).toInstant();
	}

//#endregion
//#region src/help.ts
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}
	function roundTo(num, decimals) {
		const factor = 10 ** decimals;
		return Math.round(num * factor) / factor;
	}
	var init_help = __esmMin((() => {}));

//#endregion
//#region src/kit/schema-utils.ts
	function isObject(value) {
		return typeof value === "object" && value !== null;
	}
	function isNumberArray(value) {
		if (!Array.isArray(value)) return false;
		for (const item of value) if (typeof item !== "number" || !Number.isFinite(item)) return false;
		return true;
	}
	var init_schema_utils = __esmMin((() => {}));

//#endregion
//#region src/kit/schema.ts
	var FSRSMemoryStateSchema;
	var init_schema = __esmMin((() => {
		init_schema_utils();
		FSRSMemoryStateSchema = defineSchema((value) => {
			if (isObject(value) && typeof value.stability === "number" && typeof value.difficulty === "number") return { value: {
				stability: value.stability,
				difficulty: value.difficulty
			} };
			return { issues: [{ message: "Expected FSRS memory state" }] };
		});
	}));

//#endregion
//#region src/error.ts
	var FSRSError, FSRSValidationError;
	var init_error = __esmMin((() => {
		FSRSError = class FSRSError extends Error {
			constructor(message = "FSRS Error") {
				var _Error$captureStackTr, _Error;
				super(message);
				this.name = "FSRSError";
				(_Error$captureStackTr = (_Error = Error).captureStackTrace) === null || _Error$captureStackTr === void 0 || _Error$captureStackTr.call(_Error, this, FSRSError);
			}
		};
		FSRSValidationError = class FSRSValidationError extends FSRSError {
			constructor(message) {
				var _Error$captureStackTr2, _Error2;
				super(message);
				this.name = "FSRSValidationError";
				(_Error$captureStackTr2 = (_Error2 = Error).captureStackTrace) === null || _Error$captureStackTr2 === void 0 || _Error$captureStackTr2.call(_Error2, this, FSRSValidationError);
			}
		};
	}));

//#endregion
//#region src/legacy/convert.ts
	init_error();
	init_state_RShdT6C8();
	init_objectSpread2();
	var TypeConvert = class TypeConvert {
		static card(card) {
			return _objectSpread2(_objectSpread2({}, card), {}, {
				state: TypeConvert.state(card.state),
				due: TypeConvert.time(card.due),
				last_review: card.last_review ? TypeConvert.time(card.last_review) : void 0
			});
		}
		static rating(value) {
			if (typeof value === "string") {
				const ret = Rating[`${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`];
				if (ret === void 0) throw new FSRSValidationError(`Invalid rating:[${value}]`);
				return ret;
			} else if (typeof value === "number") return value;
			throw new FSRSValidationError(`Invalid rating:[${value}]`);
		}
		static state(value) {
			if (typeof value === "string") {
				const ret = State[`${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`];
				if (ret === void 0) throw new FSRSValidationError(`Invalid state:[${value}]`);
				return ret;
			} else if (typeof value === "number") return value;
			throw new FSRSValidationError(`Invalid state:[${value}]`);
		}
		static time(value) {
			if (value instanceof Date) return value;
			const date = new Date(value);
			if (typeof value === "object" && value !== null && !Number.isNaN(Date.parse(value) || +date)) return date;
			else if (typeof value === "string") {
				const timestamp = Date.parse(value);
				if (!Number.isNaN(timestamp)) return new Date(timestamp);
				else throw new FSRSValidationError(`Invalid date:[${value}]`);
			} else if (typeof value === "number") return new Date(value);
			throw new FSRSValidationError(`Invalid date:[${value}]`);
		}
		static review_log(log) {
			return _objectSpread2(_objectSpread2({}, log), {}, {
				due: TypeConvert.time(log.due),
				rating: TypeConvert.rating(log.rating),
				state: TypeConvert.state(log.state),
				review: TypeConvert.time(log.review)
			});
		}
	};

//#endregion
//#region src/middlewares/fuzzing/core.ts
	const FUZZ_RANGES = Object.freeze([
		{
			start: 2.5,
			end: 7,
			factor: .15
		},
		{
			start: 7,
			end: 20,
			factor: .1
		},
		{
			start: 20,
			end: Number.POSITIVE_INFINITY,
			factor: .05
		}
	]);
	function getFuzzRange(interval, elapsedDays, maximumInterval, fuzzRanges = FUZZ_RANGES) {
		let delta = 1;
		for (const range of fuzzRanges) delta += range.factor * Math.max(Math.min(interval, range.end) - range.start, 0);
		const cappedInterval = Math.min(interval, maximumInterval);
		let minInterval = Math.max(2, Math.round(cappedInterval - delta));
		const maxInterval = Math.min(Math.round(cappedInterval + delta), maximumInterval);
		if (cappedInterval > elapsedDays) minInterval = Math.max(minInterval, elapsedDays + 1);
		minInterval = Math.min(minInterval, maxInterval);
		return {
			minInterval,
			maxInterval
		};
	}
	function fnv1a32(str) {
		let hash = 2166136261;
		for (let index = 0; index < str.length; index += 1) {
			hash ^= str.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return hash >>> 0;
	}
	function mulberry32(seed) {
		let a = seed >>> 0;
		return () => {
			let t = a += 1831565813;
			t = Math.imul(t ^ t >>> 15, t | 1);
			t ^= t + Math.imul(t ^ t >>> 7, t | 61);
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	}
	const fnv1aMulberry32Rng = (seed) => mulberry32(fnv1a32(seed));
	/**
	* Returns an integer interval with optional deterministic fuzzing applied.
	*/
	function withFuzzing(interval, elapsedDays, config, seed) {
		if (!config.enableFuzz || interval < 2.5) return Math.round(interval);
		const { minInterval, maxInterval } = getFuzzRange(interval, elapsedDays, config.maximumInterval);
		const fuzzFactor = fnv1aMulberry32Rng(seed !== null && seed !== void 0 ? seed : String(Date.now()))();
		return Math.floor(fuzzFactor * (maxInterval - minInterval + 1) + minInterval);
	}

//#endregion
//#region src/legacy/help.ts
	init_error();
	init_state_RShdT6C8();
	/**
	* 计算日期和时间的偏移，并返回一个新的日期对象。
	* @param now 当前日期和时间
	* @param t 时间偏移量，当 isDay 为 true 时表示天数，为 false 时表示分钟
	* @param isDay （可选）是否按天数单位进行偏移，默认为 false，表示按分钟单位计算偏移
	* @returns 偏移后的日期和时间对象
	*/
	function date_scheduler(now, t, isDay) {
		return new Date(isDay ? TypeConvert.time(now).getTime() + t * 24 * 60 * 60 * 1e3 : TypeConvert.time(now).getTime() + t * 60 * 1e3);
	}
	function date_diff(now, pre, unit) {
		if (!now || !pre) throw new FSRSValidationError("Invalid date");
		const diff = TypeConvert.time(now).getTime() - TypeConvert.time(pre).getTime();
		let r = 0;
		switch (unit) {
			case "days":
				r = Math.floor(diff / (1440 * 60 * 1e3));
				break;
			case "minutes":
				r = Math.floor(diff / (60 * 1e3));
				break;
		}
		return r;
	}
	function formatDate(dateInput) {
		const date = TypeConvert.time(dateInput);
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const hours = date.getHours();
		const minutes = date.getMinutes();
		const seconds = date.getSeconds();
		return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
	}
	function padZero(num) {
		return num < 10 ? `0${num}` : `${num}`;
	}
	const TIMEUNIT = [
		60,
		60,
		24,
		31,
		12
	];
	const TIMEUNITFORMAT = [
		"second",
		"min",
		"hour",
		"day",
		"month",
		"year"
	];
	function show_diff_message(due, last_review, unit, timeUnit = TIMEUNITFORMAT) {
		due = TypeConvert.time(due);
		last_review = TypeConvert.time(last_review);
		if (timeUnit.length !== TIMEUNITFORMAT.length) timeUnit = TIMEUNITFORMAT;
		let diff = due.getTime() - last_review.getTime();
		let i = 0;
		diff /= 1e3;
		for (i = 0; i < TIMEUNIT.length; i++) {
			if (diff < TIMEUNIT[i]) break;
			diff /= TIMEUNIT[i];
		}
		return `${Math.floor(diff)}${unit ? timeUnit[i] : ""}`;
	}
	const Grades = Object.freeze([
		Rating.Again,
		Rating.Hard,
		Rating.Good,
		Rating.Easy
	]);
	/** @deprecated Use getFuzzRange from the fuzzing core. */
	function get_fuzz_range(interval, elapsed_days, maximum_interval) {
		const { minInterval, maxInterval } = getFuzzRange(interval, elapsed_days, maximum_interval);
		return {
			min_ivl: minInterval,
			max_ivl: maxInterval
		};
	}
	function dateDiffInDays(last, cur) {
		const utc1 = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
		const utc2 = Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate());
		return Math.floor((utc2 - utc1) / 864e5);
	}

//#endregion
//#region src/legacy/abstract_scheduler.ts
	init_error();
	init_state_RShdT6C8();
	init_defineProperty();
	var AbstractScheduler = class {
		constructor(card, now, model, parameters, strategies) {
			_defineProperty(this, "last", void 0);
			_defineProperty(this, "current", void 0);
			_defineProperty(this, "review_time", void 0);
			_defineProperty(this, "next", /* @__PURE__ */ new Map());
			_defineProperty(this, "model", void 0);
			_defineProperty(this, "parameters", void 0);
			_defineProperty(this, "strategies", void 0);
			_defineProperty(this, "elapsed_days", 0);
			_defineProperty(this, "_seed", void 0);
			this.model = model;
			this.parameters = parameters;
			this.last = TypeConvert.card(card);
			this.current = TypeConvert.card(card);
			this.review_time = TypeConvert.time(now);
			this.strategies = strategies;
			this.init();
		}
		checkGrade(grade) {
			if (!Number.isFinite(grade) || grade < 1 || grade > 4) throw new FSRSValidationError(`Invalid grade "${grade}",expected 1-4`);
		}
		init() {
			const { state, last_review } = this.current;
			let interval = 0;
			if (state !== State.New && last_review) interval = dateDiffInDays(last_review, this.review_time);
			this.current.last_review = this.review_time;
			this.elapsed_days = interval;
			this.current.reps += 1;
			this._seed = `${this.review_time.getTime()}_${this.current.reps}_${this.current.difficulty * this.current.stability}`;
		}
		preview() {
			return {
				[Rating.Again]: this.review(Rating.Again),
				[Rating.Hard]: this.review(Rating.Hard),
				[Rating.Good]: this.review(Rating.Good),
				[Rating.Easy]: this.review(Rating.Easy),
				[Symbol.iterator]: this.previewIterator.bind(this)
			};
		}
		*previewIterator() {
			for (const grade of Grades) yield this.review(grade);
		}
		review(grade) {
			const { state } = this.last;
			let item;
			this.checkGrade(grade);
			switch (state) {
				case State.New:
					item = this.newState(grade);
					break;
				case State.Learning:
				case State.Relearning:
					item = this.learningState(grade);
					break;
				case State.Review:
					item = this.reviewState(grade);
					break;
			}
			return item;
		}
		buildLog(rating) {
			const { last_review, due } = this.last;
			return {
				rating,
				state: this.current.state,
				due: last_review || due,
				stability: this.current.stability,
				difficulty: this.current.difficulty,
				scheduled_days: this.current.scheduled_days,
				learning_steps: this.current.learning_steps,
				review: this.review_time
			};
		}
	};

//#endregion
//#region package.json
	var version = "6.0.0-beta.7";

//#endregion
//#region src/models/fsrs-5/constants.ts
	var FSRS5_DECAY, FSRS5_FACTOR, FSRS5_W17_W18_CEILING, INIT_S_MAX$3, FSRS5_MODEL_BOUNDS, FSRS5_DEFAULT_WEIGHTS, FSRS5ParameterBounds;
	var init_constants$4 = __esmMin((() => {
		FSRS5_DECAY = .5;
		FSRS5_FACTOR = 19 / 81;
		FSRS5_W17_W18_CEILING = 2;
		INIT_S_MAX$3 = 100;
		FSRS5_MODEL_BOUNDS = Object.freeze({
			sMin: .01,
			sMax: 36500,
			dMin: 1,
			dMax: 10
		});
		FSRS5_DEFAULT_WEIGHTS = Object.freeze([
			.40255,
			1.18385,
			3.173,
			15.69105,
			7.1949,
			.5345,
			1.4604,
			.0046,
			1.54575,
			.1192,
			1.01925,
			1.9395,
			.11,
			.29605,
			2.2698,
			.2315,
			2.9898,
			.51655,
			.6621
		]);
		FSRS5ParameterBounds = () => [
			[FSRS5_MODEL_BOUNDS.sMin, 100],
			[FSRS5_MODEL_BOUNDS.sMin, 100],
			[FSRS5_MODEL_BOUNDS.sMin, 100],
			[FSRS5_MODEL_BOUNDS.sMin, 100],
			[FSRS5_MODEL_BOUNDS.dMin, FSRS5_MODEL_BOUNDS.dMax],
			[.001, 4],
			[.001, 4],
			[.001, .75],
			[0, 4.5],
			[0, .8],
			[.001, 3.5],
			[.001, 5],
			[.001, .25],
			[.001, .9],
			[0, 4],
			[0, 1],
			[1, 6],
			[0, 2],
			[0, 2]
		];
	}));

//#endregion
//#region src/models/fsrs-6/constants.ts
	var FSRS6_DECAY, INIT_S_MAX$2, FSRS6_MODEL_BOUNDS, FSRS6_DEFAULT_WEIGHTS, FSRS6ParameterBounds;
	var init_constants$3 = __esmMin((() => {
		FSRS6_DECAY = .1542;
		INIT_S_MAX$2 = 100;
		FSRS6_MODEL_BOUNDS = Object.freeze({
			sMin: .001,
			sMax: 36500,
			dMin: 1,
			dMax: 10
		});
		FSRS6_DEFAULT_WEIGHTS = Object.freeze([
			.212,
			1.2931,
			2.3065,
			8.2956,
			6.4133,
			.8334,
			3.0194,
			.001,
			1.8722,
			.1666,
			.796,
			1.4835,
			.0614,
			.2629,
			1.6483,
			.6014,
			1.8729,
			.5425,
			.0912,
			.0658,
			FSRS6_DECAY
		]);
		FSRS6ParameterBounds = (w17W18Ceiling, enableShortTerm = true) => [
			[FSRS6_MODEL_BOUNDS.sMin, 100],
			[FSRS6_MODEL_BOUNDS.sMin, 100],
			[FSRS6_MODEL_BOUNDS.sMin, 100],
			[FSRS6_MODEL_BOUNDS.sMin, 100],
			[FSRS6_MODEL_BOUNDS.dMin, FSRS6_MODEL_BOUNDS.dMax],
			[.001, 4],
			[.001, 4],
			[.001, .75],
			[0, 4.5],
			[0, .8],
			[.001, 3.5],
			[.001, 5],
			[.001, .25],
			[.001, .9],
			[0, 4],
			[0, 1],
			[1, 6],
			[0, w17W18Ceiling],
			[0, w17W18Ceiling],
			[enableShortTerm ? .01 : 0, .8],
			[.1, .8]
		];
	}));

//#endregion
//#region src/legacy/constant.ts
	init_constants$4();
	init_constants$3();
	const default_request_retention = .9;
	const default_maximum_interval = 36500;
	const default_enable_fuzz = false;
	const default_enable_short_term = true;
	const FSRSVersion = `v${version} using FSRS-6.0`;
	const S_MIN = FSRS6_MODEL_BOUNDS.sMin;
	const S_MAX = FSRS6_MODEL_BOUNDS.sMax;
	const INIT_S_MAX = 100;
	const default_w = FSRS6_DEFAULT_WEIGHTS;
	const W17_W18_Ceiling = 2;
	const CLAMP_PARAMETERS = FSRS6ParameterBounds;

//#endregion
//#region src/middlewares/learning-steps/schema.ts
	init_esm();
	const STEP_UNIT_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[mhd]$/;
	const defaultLearningSteps = Object.freeze(["1m", "10m"]);
	const defaultRelearningSteps = Object.freeze(["10m"]);
	function isStepUnit(value) {
		return typeof value === "string" && STEP_UNIT_PATTERN.test(value) && Number.isFinite(Number(value.slice(0, -1)));
	}
	function isStepList(value) {
		return Array.isArray(value) && value.every(isStepUnit);
	}
	const learningStepsConfigSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected learning steps config object" }] };
		const { enableShortTerm, learningSteps, relearningSteps } = value;
		if (typeof enableShortTerm !== "boolean") return { issues: [{ message: "Expected enableShortTerm boolean" }] };
		if (!isStepList(learningSteps)) return { issues: [{ message: "Expected valid learningSteps array" }] };
		if (!isStepList(relearningSteps)) return { issues: [{ message: "Expected valid relearningSteps array" }] };
		return { value: {
			enableShortTerm,
			learningSteps,
			relearningSteps
		} };
	});
	const learningStepFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected learning step fields object" }] };
		const { learningStep } = value;
		if (learningStep === void 0) return { value: { learningStep: 0 } };
		if (typeof learningStep !== "number" || !Number.isInteger(learningStep) || learningStep < 0) return { issues: [{ message: "Expected non-negative integer learningStep" }] };
		return { value: { learningStep } };
	});

//#endregion
//#region src/models/fsrs-6/parameters.ts
	var decaySchema, clipFSRS6Parameters, checkFSRS6Parameters, migrateFSRS6Parameters, fsrs6ConfigSchema;
	var init_parameters$4 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_schema_utils();
		init_constants$4();
		init_constants$3();
		decaySchema = defineSchema((value) => typeof value === "number" && value >= .1 && value <= .8 ? { value } : { issues: [{ message: "Expected decay between 0.1 and 0.8" }] });
		clipFSRS6Parameters = (parameters, numRelearningSteps = 0, enableShortTerm = true) => {
			const clip = FSRS6ParameterBounds(2, enableShortTerm).slice(0, parameters.length);
			if (Math.max(0, numRelearningSteps) > 1 && parameters.length >= 19) {
				const w11 = clamp(parameters[11] || 0, clip[11][0], clip[11][1]);
				const w13 = clamp(parameters[13] || 0, clip[13][0], clip[13][1]);
				const w14 = clamp(parameters[14] || 0, clip[14][0], clip[14][1]);
				const value = -(Math.log(w11) + Math.log(Math.pow(2, w13) - 1) + w14 * .3) / numRelearningSteps;
				const w17W18Ceiling = clamp(roundTo(Math.sqrt(Math.max(value, 0)), 8), .01, 2);
				clip[17] = [clip[17][0], w17W18Ceiling];
				clip[18] = [clip[18][0], w17W18Ceiling];
			}
			return clip.map(([min, max], index) => clamp(parameters[index] || 0, min, max));
		};
		checkFSRS6Parameters = (parameters, numRelearningSteps = 0, enableShortTerm = true) => {
			const clipped = clipFSRS6Parameters(Array.from(parameters), numRelearningSteps, enableShortTerm);
			if (!(parameters.length === FSRS6_DEFAULT_WEIGHTS.length && clipped.every((value, index) => value === parameters[index]))) throw new FSRSValidationError("Expected FSRS6 weights within model bounds.");
			return parameters;
		};
		migrateFSRS6Parameters = (parameters, numRelearningSteps = 0, enableShortTerm = true) => {
			if (!Array.isArray(parameters) || parameters.length === 0) return [...FSRS6_DEFAULT_WEIGHTS];
			switch (parameters.length) {
				case 21: return clipFSRS6Parameters(Array.from(parameters), numRelearningSteps, enableShortTerm);
				case 19: return clipFSRS6Parameters(Array.from(parameters), numRelearningSteps, enableShortTerm).concat([0, FSRS5_DECAY]);
				case 17: {
					const weights = clipFSRS6Parameters(Array.from(parameters), numRelearningSteps, enableShortTerm);
					weights[4] = +(weights[5] * 2 + weights[4]).toFixed(8);
					weights[5] = +(Math.log(weights[5] * 3 + 1) / 3).toFixed(8);
					weights[6] = +(weights[6] + .5).toFixed(8);
					return weights.concat([
						0,
						0,
						0,
						FSRS5_DECAY
					]);
				}
				default: throw new FSRSValidationError(`Invalid parameters length "${parameters.length}", expected 17, 19 or 21.`);
			}
		};
		fsrs6ConfigSchema = defineSchema((value) => {
			if (isObject$1(value) && isNumberArray(value.weights) && typeof value.enableShortTerm === "boolean" && typeof value.numRelearningSteps === "number" && Number.isFinite(value.numRelearningSteps)) return { value: {
				weights: value.weights,
				enableShortTerm: value.enableShortTerm,
				numRelearningSteps: value.numRelearningSteps
			} };
			return { issues: [{ message: "Expected FSRS6 config" }] };
		});
	}));

//#endregion
//#region src/legacy/default.ts
	init_error();
	init_parameters$4();
	init_state_RShdT6C8();
	/**
	* @returns The input if the parameters are valid, throws if they are invalid
	* @example
	* try {
	*   generatorParameters({
	*     w: checkParameters([0.40255])
	*   });
	* } catch (e: any) {
	*   alert(e);
	* }
	*/
	const checkParameters = (parameters) => {
		if (parameters.find((param) => !Number.isFinite(param)) !== void 0) throw new FSRSValidationError(`Non-finite or NaN value in parameters ${parameters}`);
		else if (![
			17,
			19,
			21
		].includes(parameters.length)) throw new FSRSValidationError(`Invalid parameter length: ${parameters.length}. Must be 17, 19 or 21 for FSRSv4, 5 and 6 respectively.`);
		return parameters;
	};
	const generatorParameters = (props) => {
		var _props$enable_short_t, _props$enable_fuzz;
		const learning_steps = Array.isArray(props === null || props === void 0 ? void 0 : props.learning_steps) ? props.learning_steps : defaultLearningSteps;
		const relearning_steps = Array.isArray(props === null || props === void 0 ? void 0 : props.relearning_steps) ? props.relearning_steps : defaultRelearningSteps;
		const enable_short_term = (_props$enable_short_t = props === null || props === void 0 ? void 0 : props.enable_short_term) !== null && _props$enable_short_t !== void 0 ? _props$enable_short_t : true;
		const w = migrateFSRS6Parameters((props === null || props === void 0 ? void 0 : props.w) ? Array.from(props.w) : void 0, relearning_steps.length, enable_short_term);
		return {
			request_retention: (props === null || props === void 0 ? void 0 : props.request_retention) || .9,
			maximum_interval: (props === null || props === void 0 ? void 0 : props.maximum_interval) || 36500,
			w,
			enable_fuzz: (_props$enable_fuzz = props === null || props === void 0 ? void 0 : props.enable_fuzz) !== null && _props$enable_fuzz !== void 0 ? _props$enable_fuzz : false,
			enable_short_term,
			learning_steps,
			relearning_steps
		};
	};
	/**
	* Create an empty card
	* @param now Current time
	* @example
	* ```typescript
	* const card: Card = createEmptyCard(new Date());
	* ```
	*/
	function createEmptyCard(now) {
		return {
			due: now ? TypeConvert.time(now) : /* @__PURE__ */ new Date(),
			stability: 0,
			difficulty: 0,
			scheduled_days: 0,
			reps: 0,
			lapses: 0,
			learning_steps: 0,
			state: State.New,
			last_review: void 0
		};
	}

//#endregion
//#region src/models/fsrs-6/algorithm.ts
	function forgetting_curve$4(decayOrParams, elapsed_days, stability) {
		const { decay, factor } = computeDecayFactor(decayOrParams);
		return roundTo(Math.pow(1 + factor * elapsed_days / stability, decay), 8);
	}
	var computeDecayFactor, FSRS6Algorithm;
	var init_algorithm$4 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_defineProperty();
		computeDecayFactor = (decayOrParams) => {
			const decay = typeof decayOrParams === "number" ? -decayOrParams : -decayOrParams[20];
			return {
				decay,
				factor: roundTo(Math.exp(Math.pow(decay, -1) * Math.log(.9)) - 1, 8)
			};
		};
		FSRS6Algorithm = class {
			constructor(weights, enableShortTerm, bounds) {
				this.weights = weights;
				this.enableShortTerm = enableShortTerm;
				this.bounds = bounds;
				_defineProperty(this, "decayWeight", NaN);
				_defineProperty(this, "decay", 0);
				_defineProperty(this, "factor", 0);
				_defineProperty(this, "forgetting_curve", void 0);
				if (!Array.isArray(weights) || weights.length !== 21) throw new FSRSValidationError(`FSRS6Algorithm requires exactly 21 weights, but received ${weights === null || weights === void 0 ? void 0 : weights.length}`);
				this.forgetting_curve = (elapsed_days, stability) => {
					const { decay, factor } = this.getDecayFactor();
					return roundTo(Math.pow(1 + factor * elapsed_days / stability, decay), 8);
				};
			}
			getDecayFactor() {
				const decayWeight = this.weights[20];
				if (decayWeight !== this.decayWeight) {
					const { decay, factor } = computeDecayFactor(decayWeight);
					this.decayWeight = decayWeight;
					this.decay = decay;
					this.factor = factor;
				}
				return {
					decay: this.decay,
					factor: this.factor
				};
			}
			init_stability(g) {
				return Math.max(this.weights[g - 1], .1);
			}
			init_difficulty(g) {
				const w = this.weights;
				return roundTo(w[4] - Math.exp((g - 1) * w[5]) + 1, 8);
			}
			next_interval(s, desired_retention) {
				if (!Number.isFinite(desired_retention) || desired_retention <= 0 || desired_retention > 1) throw new FSRSValidationError("Desired retention rate should be in the range (0,1]");
				const { decay, factor } = this.getDecayFactor();
				return Math.max(Math.round(s / factor * (Math.pow(desired_retention, 1 / decay) - 1)), 1);
			}
			/**
			* @see https://github.com/open-spaced-repetition/fsrs4anki/issues/697
			*/
			linear_damping(delta_d, old_d) {
				return roundTo(delta_d * (10 - old_d) / 9, 8);
			}
			next_difficulty(d, g) {
				const delta_d = -this.weights[6] * (g - 3);
				const next_d = d + this.linear_damping(delta_d, d);
				return clamp(this.mean_reversion(this.init_difficulty(Rating.Easy), next_d), 1, 10);
			}
			mean_reversion(init, current) {
				const w = this.weights;
				return roundTo(w[7] * init + (1 - w[7]) * current, 8);
			}
			next_recall_stability(d, s, r, g) {
				const w = this.weights;
				const hard_penalty = Rating.Hard === g ? w[15] : 1;
				const easy_bound = Rating.Easy === g ? w[16] : 1;
				return roundTo(clamp(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard_penalty * easy_bound), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_forget_stability(d, s, r) {
				const w = this.weights;
				return roundTo(clamp(w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_short_term_stability(s, g) {
				const w = this.weights;
				const sinc = Math.pow(s, -w[19]) * Math.exp(w[17] * (g - 3 + w[18]));
				return roundTo(clamp(s * (g >= Rating.Hard ? Math.max(sinc, 1) : sinc), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_state(memory_state, t, g, r) {
				const { difficulty: d, stability: s } = memory_state !== null && memory_state !== void 0 ? memory_state : {
					difficulty: 0,
					stability: 0
				};
				if (t < 0) throw new FSRSValidationError(`Invalid delta_t "${t}"`);
				if (g < 0 || g > 4) throw new FSRSValidationError(`Invalid grade "${g}"`);
				if (g === Rating.Manual) return {
					difficulty: d,
					stability: s
				};
				const grade = g;
				if (d === 0 && s === 0) return {
					difficulty: clamp(this.init_difficulty(grade), 1, 10),
					stability: this.init_stability(grade)
				};
				if (d < 1 || s < this.bounds.sMin) throw new FSRSValidationError(`Invalid memory state { difficulty: ${d}, stability: ${s} }`);
				const w = this.weights;
				r = typeof r === "number" ? r : this.forgetting_curve(t, s);
				let new_s;
				if (t === 0 && this.enableShortTerm) new_s = this.next_short_term_stability(s, grade);
				else if (g === 1) {
					const s_after_fail = this.next_forget_stability(d, s, r);
					let [w_17, w_18] = [0, 0];
					if (this.enableShortTerm) {
						w_17 = w[17];
						w_18 = w[18];
					}
					new_s = clamp(roundTo(s / Math.exp(w_17 * w_18), 8), this.bounds.sMin, s_after_fail);
				} else new_s = this.next_recall_stability(d, s, r, grade);
				return {
					difficulty: this.next_difficulty(d, grade),
					stability: new_s
				};
			}
		};
	}));

//#endregion
//#region src/kit/index.ts
	var init_kit = __esmMin((() => {
		init_schema();
	}));

//#endregion
//#region src/models/fsrs-6/model.ts
	var createFSRS6Model, FSRS6Model;
	var init_model$4 = __esmMin((() => {
		init_esm();
		init_kit();
		init_algorithm$4();
		init_constants$3();
		init_parameters$4();
		createFSRS6Model = (config) => {
			const bounds = FSRS6_MODEL_BOUNDS;
			const algo = new FSRS6Algorithm(config.weights, config.enableShortTerm, FSRS6_MODEL_BOUNDS);
			const step = ({ memoryState, rating, elapsedDays, retrievability }) => {
				return algo.next_state(memoryState, elapsedDays, rating, retrievability);
			};
			const nextInterval = (memoryState, desiredRetention) => {
				return algo.next_interval(memoryState.stability, desiredRetention);
			};
			const forgettingCurve = (memoryState, elapsedDays) => {
				return algo.forgetting_curve(elapsedDays, memoryState.stability);
			};
			const forward = ({ history, initialState }) => {
				const states = [];
				let memoryState = initialState || null;
				for (const review of history) {
					memoryState = step({
						memoryState,
						rating: review.rating,
						elapsedDays: review.deltaT
					});
					states.push(memoryState);
				}
				return states;
			};
			return {
				config,
				bounds,
				algorithm: algo,
				step,
				nextInterval,
				forgettingCurve,
				forward
			};
		};
		FSRS6Model = defineModel({
			name: "fsrs-6",
			schema: {
				config: fsrs6ConfigSchema,
				memoryState: FSRSMemoryStateSchema
			},
			defaultValue: { memoryState() {
				return {
					stability: 0,
					difficulty: 0
				};
			} },
			create({ config, migrate = true, check = true, bypass = false }) {
				if (bypass) return createFSRS6Model(config);
				const weights = migrate ? migrateFSRS6Parameters(config.weights, config.numRelearningSteps, config.enableShortTerm) : config.weights;
				if (check) checkFSRS6Parameters(weights, config.numRelearningSteps, config.enableShortTerm);
				const $config = fsrs6ConfigSchema.parse({
					weights,
					enableShortTerm: config.enableShortTerm,
					numRelearningSteps: config.numRelearningSteps
				});
				return createFSRS6Model(Object.freeze($config));
			}
		});
	}));

//#endregion
//#region src/models/fsrs-6/index.ts
	var fsrs_6_exports = /* @__PURE__ */ __exportAll({
		FSRS6Algorithm: () => FSRS6Algorithm,
		FSRS6Model: () => FSRS6Model,
		FSRS6_DECAY: () => FSRS6_DECAY,
		FSRS6_DEFAULT_WEIGHTS: () => FSRS6_DEFAULT_WEIGHTS,
		FSRS6_MODEL_BOUNDS: () => FSRS6_MODEL_BOUNDS,
		FSRS6_W17_W18_CEILING: () => 2,
		checkFSRS6Parameters: () => checkFSRS6Parameters,
		clipFSRS6Parameters: () => clipFSRS6Parameters,
		computeDecayFactor: () => computeDecayFactor,
		decaySchema: () => decaySchema,
		forgettingCurve: () => forgetting_curve$4,
		fsrs6ConfigSchema: () => fsrs6ConfigSchema,
		migrateFSRS6Parameters: () => migrateFSRS6Parameters
	});
	var init_fsrs_6 = __esmMin((() => {
		init_algorithm$4();
		init_constants$3();
		init_model$4();
		init_parameters$4();
	}));

//#endregion
//#region src/middlewares/learning-steps/core.ts
	init_esm();
	init_error();
	const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
	const ConvertStepUnitToMinutes = (step) => {
		if (typeof step !== "string" || step.length < 2) throw new FSRSValidationError(`Invalid step value: ${step}`);
		const unit = step.slice(-1);
		const numericPart = step.slice(0, -1);
		if (!DECIMAL_PATTERN.test(numericPart)) throw new FSRSValidationError(`Invalid step value: ${step}`);
		const value = Number(numericPart);
		if (!Number.isFinite(value)) throw new FSRSValidationError(`Invalid step value: ${step}`);
		switch (unit) {
			case "m": return value;
			case "h": return value * 60;
			case "d": return value * 1440;
			default: throw new FSRSValidationError(`Invalid step unit: ${step}, expected m/h/d`);
		}
	};
	/**
	* Calculates the grade-specific schedule for the current learning step.
	*
	* The focused config keeps this core independent from the legacy
	* `FSRSParameters` shape so it can also drive the scheduler middleware.
	*/
	const calculateLearningSteps = (config, state, learningStep) => {
		const steps = state === State.Relearning || state === State.Review ? config.relearningSteps : config.learningSteps;
		const stepsLength = steps.length;
		if (stepsLength === 0 || learningStep >= stepsLength) return {};
		const learningStepUnit = steps[Math.max(0, learningStep)];
		if (state === State.Review) return { [Rating.Again]: {
			scheduledMinutes: ConvertStepUnitToMinutes(learningStepUnit),
			nextStep: 0
		} };
		const firstMinutes = ConvertStepUnitToMinutes(steps[0]);
		const secondMinutes = stepsLength > 1 ? ConvertStepUnitToMinutes(steps[1]) : void 0;
		const hardMinutes = secondMinutes === void 0 ? Math.round(firstMinutes * 1.5) : Math.round((firstMinutes + secondMinutes) / 2);
		const result = {
			[Rating.Again]: {
				scheduledMinutes: firstMinutes,
				nextStep: 0
			},
			[Rating.Hard]: {
				scheduledMinutes: hardMinutes,
				nextStep: learningStep
			}
		};
		const nextStepUnit = steps[learningStep + 1];
		if (nextStepUnit) {
			const nextMinutes = learningStep === 0 && secondMinutes !== void 0 ? secondMinutes : ConvertStepUnitToMinutes(nextStepUnit);
			if (nextMinutes > 0) result[Rating.Good] = {
				scheduledMinutes: Math.round(nextMinutes),
				nextStep: learningStep + 1
			};
		}
		return result;
	};

//#endregion
//#region src/middlewares/monotonic-interval/core.ts
/**
	* Keeps rating intervals monotonic after rounding and fuzzing.
	*
	* The first interval is capped at the maximum. Zero-day intervals may remain
	* equal; after a positive result, each later interval is kept at least one day
	* after the previous result until the maximum is reached. The input tuple is
	* never mutated.
	*/
	function calculateScheduleDays(candidates, maximumInterval) {
		const first = Math.min(candidates[0], maximumInterval);
		if (candidates.length === 1) return [first];
		const second = Math.min(Math.max(candidates[1], first === 0 ? 0 : first + 1), maximumInterval);
		if (candidates.length === 2) return [first, second];
		const third = Math.min(Math.max(candidates[2], second === 0 ? 0 : second + 1), maximumInterval);
		if (candidates.length === 3) return [
			first,
			second,
			third
		];
		return [
			first,
			second,
			third,
			Math.min(Math.max(candidates[3], third === 0 ? 0 : third + 1), maximumInterval)
		];
	}
	function calculateScheduleDay(candidates, maximumInterval) {
		var _scheduledDay;
		const currentInterval = candidates[candidates.length - 1];
		let scheduledDay;
		for (const interval of candidates) {
			if (interval < 1) continue;
			if (scheduledDay === void 0) scheduledDay = Math.min(interval, maximumInterval);
			else scheduledDay = Math.min(Math.max(interval, scheduledDay + 1), maximumInterval);
		}
		return (_scheduledDay = scheduledDay) !== null && _scheduledDay !== void 0 ? _scheduledDay : currentInterval;
	}

//#endregion
//#region src/legacy/strategies/types.ts
	let StrategyMode = /* @__PURE__ */ function(StrategyMode) {
		StrategyMode["SCHEDULER"] = "Scheduler";
		StrategyMode["LEARNING_STEPS"] = "LearningSteps";
		return StrategyMode;
	}({});

//#endregion
//#region src/legacy/impl/basic_scheduler.ts
	init_state_RShdT6C8();
	init_defineProperty();
	var BasicScheduler = class extends AbstractScheduler {
		constructor(card, now, model, parameters, strategies) {
			super(card, now, model, parameters, strategies);
			_defineProperty(this, "learningSteps", void 0);
			_defineProperty(this, "learningStepsConfig", void 0);
			_defineProperty(this, "learningStepsResult", void 0);
			this.learningStepsConfig = {
				learningSteps: parameters.learning_steps,
				relearningSteps: parameters.relearning_steps
			};
			let learningSteps = calculateLearningSteps;
			if (this.strategies) {
				const customStrategy = this.strategies.get("LearningSteps");
				if (customStrategy) learningSteps = customStrategy;
			}
			this.learningSteps = learningSteps;
		}
		getLearningInfo(card, grade) {
			var _steps$grade$schedule, _steps$grade, _steps$grade$nextStep, _steps$grade2;
			card.learning_steps = card.learning_steps || 0;
			let steps = this.learningStepsResult;
			if (!steps) {
				steps = this.learningSteps(this.learningStepsConfig, card.state, card.learning_steps);
				this.learningStepsResult = steps;
			}
			return {
				scheduled_minutes: Math.max(0, (_steps$grade$schedule = (_steps$grade = steps[grade]) === null || _steps$grade === void 0 ? void 0 : _steps$grade.scheduledMinutes) !== null && _steps$grade$schedule !== void 0 ? _steps$grade$schedule : 0),
				next_steps: Math.max(0, (_steps$grade$nextStep = (_steps$grade2 = steps[grade]) === null || _steps$grade2 === void 0 ? void 0 : _steps$grade2.nextStep) !== null && _steps$grade$nextStep !== void 0 ? _steps$grade$nextStep : 0)
			};
		}
		/**
		* @description This function applies the learning steps based on the current card's state and grade.
		*/
		applyLearningSteps(nextCard, grade, to_state) {
			const { scheduled_minutes, next_steps } = this.getLearningInfo(this.current, grade);
			if (scheduled_minutes > 0 && scheduled_minutes < 1440) {
				nextCard.learning_steps = next_steps;
				nextCard.scheduled_days = 0;
				nextCard.state = to_state;
				nextCard.due = date_scheduler(this.review_time, Math.round(scheduled_minutes), false);
			} else {
				nextCard.state = State.Review;
				if (scheduled_minutes >= 1440) {
					nextCard.learning_steps = next_steps;
					nextCard.due = date_scheduler(this.review_time, Math.round(scheduled_minutes), false);
					nextCard.scheduled_days = Math.floor(scheduled_minutes / 1440);
				} else {
					nextCard.learning_steps = 0;
					const interval = this.scheduler_next_interval(nextCard, this.elapsed_days);
					nextCard.scheduled_days = interval;
					nextCard.due = date_scheduler(this.review_time, interval, true);
				}
			}
		}
		newState(grade) {
			const exist = this.next.get(grade);
			if (exist) return exist;
			const next = this.next_ds(this.elapsed_days, grade);
			this.applyLearningSteps(next, grade, State.Learning);
			const item = {
				card: next,
				log: this.buildLog(grade)
			};
			this.next.set(grade, item);
			return item;
		}
		learningState(grade) {
			const exist = this.next.get(grade);
			if (exist) return exist;
			const next = this.next_ds(this.elapsed_days, grade);
			this.applyLearningSteps(next, grade, this.last.state);
			const item = {
				card: next,
				log: this.buildLog(grade)
			};
			this.next.set(grade, item);
			return item;
		}
		reviewState(grade) {
			const exist = this.next.get(grade);
			if (exist) return exist;
			const interval = this.elapsed_days;
			const retrievability = this.model.forgettingCurve(this.current, interval);
			const next_again = this.next_ds(interval, Rating.Again, retrievability);
			const next_hard = this.next_ds(interval, Rating.Hard, retrievability);
			const next_good = this.next_ds(interval, Rating.Good, retrievability);
			const next_easy = this.next_ds(interval, Rating.Easy, retrievability);
			this.next_interval(next_hard, next_good, next_easy, interval);
			this.next_state(next_hard, next_good, next_easy);
			this.applyLearningSteps(next_again, Rating.Again, State.Relearning);
			next_again.lapses += 1;
			const item_again = {
				card: next_again,
				log: this.buildLog(Rating.Again)
			};
			const item_hard = {
				card: next_hard,
				log: super.buildLog(Rating.Hard)
			};
			const item_good = {
				card: next_good,
				log: super.buildLog(Rating.Good)
			};
			const item_easy = {
				card: next_easy,
				log: super.buildLog(Rating.Easy)
			};
			this.next.set(Rating.Again, item_again);
			this.next.set(Rating.Hard, item_hard);
			this.next.set(Rating.Good, item_good);
			this.next.set(Rating.Easy, item_easy);
			return this.next.get(grade);
		}
		/**
		* Review next_ds
		*/
		next_ds(t, g, retrievability) {
			const next_state = this.model.step({
				memoryState: this.current,
				elapsedDays: t,
				rating: g,
				retrievability
			});
			const card = TypeConvert.card(this.current);
			card.difficulty = next_state.difficulty;
			card.stability = next_state.stability;
			return card;
		}
		/**
		* Review next_interval
		*/
		next_interval(next_hard, next_good, next_easy, interval) {
			const { maximum_interval } = this.parameters;
			const [hard_interval, good_interval, easy_interval] = calculateScheduleDays([
				this.scheduler_next_interval(next_hard, interval),
				this.scheduler_next_interval(next_good, interval),
				this.scheduler_next_interval(next_easy, interval)
			], maximum_interval);
			next_hard.scheduled_days = hard_interval;
			next_hard.due = date_scheduler(this.review_time, hard_interval, true);
			next_good.scheduled_days = good_interval;
			next_good.due = date_scheduler(this.review_time, good_interval, true);
			next_easy.scheduled_days = easy_interval;
			next_easy.due = date_scheduler(this.review_time, easy_interval, true);
		}
		scheduler_next_interval(card, elapsed_days) {
			const params = this.parameters;
			return withFuzzing(this.model.nextInterval(card, params.request_retention), elapsed_days, {
				enableFuzz: params.enable_fuzz,
				maximumInterval: params.maximum_interval
			}, this._seed);
		}
		/**
		* Review next_state
		*/
		next_state(next_hard, next_good, next_easy) {
			next_hard.state = State.Review;
			next_hard.learning_steps = 0;
			next_good.state = State.Review;
			next_good.learning_steps = 0;
			next_easy.state = State.Review;
			next_easy.learning_steps = 0;
		}
	};

//#endregion
//#region src/legacy/impl/long_term_scheduler.ts
	init_state_RShdT6C8();
	var LongTermScheduler = class extends AbstractScheduler {
		newState(grade) {
			const exist = this.next.get(grade);
			if (exist) return exist;
			this.current.scheduled_days = 0;
			const first_interval = 0;
			const next_again = this.next_ds(first_interval, Rating.Again);
			const next_hard = this.next_ds(first_interval, Rating.Hard);
			const next_good = this.next_ds(first_interval, Rating.Good);
			const next_easy = this.next_ds(first_interval, Rating.Easy);
			this.next_interval(next_again, next_hard, next_good, next_easy, first_interval);
			this.next_state(next_again, next_hard, next_good, next_easy);
			this.update_next(next_again, next_hard, next_good, next_easy);
			return this.next.get(grade);
		}
		next_ds(t, g) {
			const next_state = this.model.step({
				memoryState: {
					difficulty: this.current.difficulty,
					stability: this.current.stability
				},
				elapsedDays: t,
				rating: g
			});
			const card = TypeConvert.card(this.current);
			card.difficulty = next_state.difficulty;
			card.stability = next_state.stability;
			return card;
		}
		/**
		* @see https://github.com/open-spaced-repetition/ts-fsrs/issues/98#issuecomment-2241923194
		*/
		learningState(grade) {
			return this.reviewState(grade);
		}
		reviewState(grade) {
			const exist = this.next.get(grade);
			if (exist) return exist;
			const interval = this.elapsed_days;
			const next_again = this.next_ds(interval, Rating.Again);
			const next_hard = this.next_ds(interval, Rating.Hard);
			const next_good = this.next_ds(interval, Rating.Good);
			const next_easy = this.next_ds(interval, Rating.Easy);
			this.next_interval(next_again, next_hard, next_good, next_easy, interval);
			this.next_state(next_again, next_hard, next_good, next_easy);
			next_again.lapses += 1;
			this.update_next(next_again, next_hard, next_good, next_easy);
			return this.next.get(grade);
		}
		/**
		* Review/New next_interval
		*/
		next_interval(next_again, next_hard, next_good, next_easy, interval) {
			const { maximum_interval } = this.parameters;
			const [again_interval, hard_interval, good_interval, easy_interval] = calculateScheduleDays([
				this.scheduler_next_interval(next_again, interval),
				this.scheduler_next_interval(next_hard, interval),
				this.scheduler_next_interval(next_good, interval),
				this.scheduler_next_interval(next_easy, interval)
			], maximum_interval);
			next_again.scheduled_days = again_interval;
			next_again.due = date_scheduler(this.review_time, again_interval, true);
			next_hard.scheduled_days = hard_interval;
			next_hard.due = date_scheduler(this.review_time, hard_interval, true);
			next_good.scheduled_days = good_interval;
			next_good.due = date_scheduler(this.review_time, good_interval, true);
			next_easy.scheduled_days = easy_interval;
			next_easy.due = date_scheduler(this.review_time, easy_interval, true);
		}
		scheduler_next_interval(card, elapsed_days) {
			const params = this.parameters;
			return withFuzzing(this.model.nextInterval({
				stability: card.stability,
				difficulty: card.difficulty
			}, params.request_retention), elapsed_days, {
				enableFuzz: params.enable_fuzz,
				maximumInterval: params.maximum_interval
			}, this._seed);
		}
		/**
		* Review/New next_state
		*/
		next_state(next_again, next_hard, next_good, next_easy) {
			next_again.state = State.Review;
			next_again.learning_steps = 0;
			next_hard.state = State.Review;
			next_hard.learning_steps = 0;
			next_good.state = State.Review;
			next_good.learning_steps = 0;
			next_easy.state = State.Review;
			next_easy.learning_steps = 0;
		}
		update_next(next_again, next_hard, next_good, next_easy) {
			const item_again = {
				card: next_again,
				log: this.buildLog(Rating.Again)
			};
			const item_hard = {
				card: next_hard,
				log: super.buildLog(Rating.Hard)
			};
			const item_good = {
				card: next_good,
				log: super.buildLog(Rating.Good)
			};
			const item_easy = {
				card: next_easy,
				log: super.buildLog(Rating.Easy)
			};
			this.next.set(Rating.Again, item_again);
			this.next.set(Rating.Hard, item_hard);
			this.next.set(Rating.Good, item_good);
			this.next.set(Rating.Easy, item_easy);
		}
	};

//#endregion
//#region src/legacy/reschedule.ts
	init_error();
	init_state_RShdT6C8();
	init_defineProperty();
	init_objectSpread2();
	/**
	* The `Reschedule` class provides methods to handle the rescheduling of cards based on their review history.
	* determine the next review dates and update the card's state accordingly.
	*/
	var Reschedule = class {
		/**
		* Creates an instance of the `Reschedule` class.
		* @param fsrs - An instance of the FSRS class used for scheduling.
		*/
		constructor(fsrs) {
			_defineProperty(this, "fsrs", void 0);
			this.fsrs = fsrs;
		}
		/**
		* Replays a review for a card and determines the next review date based on the given rating.
		* @param card - The card being reviewed.
		* @param reviewed - The date the card was reviewed.
		* @param rating - The grade given to the card during the review.
		* @returns A `RecordLogItem` containing the updated card and review log.
		*/
		replay(card, reviewed, rating) {
			return this.fsrs.next(card, reviewed, rating);
		}
		/**
		* Processes a manual review for a card, allowing for custom state, stability, difficulty, and due date.
		* @param card - The card being reviewed.
		* @param state - The state of the card after the review.
		* @param reviewed - The date the card was reviewed.
		* @param stability - (Optional) The stability of the card.
		* @param difficulty - (Optional) The difficulty of the card.
		* @param due - (Optional) The due date for the next review.
		* @returns A `RecordLogItem` containing the updated card and review log.
		* @throws Will throw an error if the state or due date is not provided when required.
		*/
		handleManualRating(card, state, reviewed, stability, difficulty, due) {
			if (typeof state === "undefined") throw new FSRSValidationError("reschedule: state is required for manual rating");
			let log;
			let next_card;
			if (state === State.New) {
				var _ref;
				log = {
					rating: Rating.Manual,
					state,
					due: (_ref = due) !== null && _ref !== void 0 ? _ref : reviewed,
					stability: card.stability,
					difficulty: card.difficulty,
					scheduled_days: card.scheduled_days,
					learning_steps: card.learning_steps,
					review: reviewed
				};
				next_card = createEmptyCard(reviewed);
				next_card.last_review = reviewed;
			} else {
				if (typeof due === "undefined") throw new FSRSValidationError("reschedule: due is required for manual rating");
				const scheduled_days = date_diff(due, reviewed, "days");
				log = {
					rating: Rating.Manual,
					state: card.state,
					due: card.last_review || card.due,
					stability: card.stability,
					difficulty: card.difficulty,
					scheduled_days: card.scheduled_days,
					learning_steps: card.learning_steps,
					review: reviewed
				};
				next_card = _objectSpread2(_objectSpread2({}, card), {}, {
					state,
					due,
					last_review: reviewed,
					stability: stability || card.stability,
					difficulty: difficulty || card.difficulty,
					scheduled_days,
					reps: card.reps + 1
				});
			}
			return {
				card: next_card,
				log
			};
		}
		/**
		* Reschedules a card based on its review history.
		*
		* @param current_card - The card to be rescheduled.
		* @param reviews - An array of review history objects.
		* @returns An array of record log items representing the rescheduling process.
		*/
		reschedule(current_card, reviews) {
			const collections = [];
			let cur_card = createEmptyCard(current_card.due);
			for (const review of reviews) {
				let item;
				review.review = TypeConvert.time(review.review);
				if (review.rating === Rating.Manual) item = this.handleManualRating(cur_card, review.state, review.review, review.stability, review.difficulty, review.due ? TypeConvert.time(review.due) : void 0);
				else item = this.replay(cur_card, review.review, review.rating);
				collections.push(item);
				cur_card = item.card;
			}
			return collections;
		}
		calculateManualRecord(current_card, now, record_log_item, update_memory) {
			if (!record_log_item) return null;
			const { card: reschedule_card } = record_log_item;
			const cur_card = TypeConvert.card(current_card);
			if (cur_card.due.getTime() === reschedule_card.due.getTime()) return null;
			cur_card.scheduled_days = date_diff(reschedule_card.due, cur_card.due, "days");
			return this.handleManualRating(cur_card, reschedule_card.state, TypeConvert.time(now), update_memory ? reschedule_card.stability : void 0, update_memory ? reschedule_card.difficulty : void 0, reschedule_card.due);
		}
	};

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/checkPrivateRedeclaration.js
	function _checkPrivateRedeclaration(e, t) {
		if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
	}

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/classPrivateFieldInitSpec.js
	function _classPrivateFieldInitSpec(e, t, a) {
		_checkPrivateRedeclaration(e, t), t.set(e, a);
	}

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/assertClassBrand.js
	function _assertClassBrand(e, t, n) {
		if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
		throw new TypeError("Private element is not present on this object");
	}

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/classPrivateFieldGet2.js
	function _classPrivateFieldGet2(s, a) {
		return s.get(_assertClassBrand(s, a));
	}

//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/classPrivateFieldSet2.js
	function _classPrivateFieldSet2(s, a, r) {
		return s.set(_assertClassBrand(s, a), r), r;
	}

//#endregion
//#region src/legacy/fsrs.ts
	init_error();
	init_fsrs_6();
	init_model$4();
	init_state_RShdT6C8();
	init_defineProperty();
	init_objectSpread2();
	var _parameters = /* @__PURE__ */ new WeakMap();
	var _model = /* @__PURE__ */ new WeakMap();
	/**
	* @deprecated This class will be removed after all tests are migrated and passing.
	* Use Scheduler going forward.
	*/
	var FSRS = class {
		constructor(parameters = {}) {
			_defineProperty(this, "strategyHandler", /* @__PURE__ */ new Map());
			_defineProperty(this, "Scheduler", void 0);
			_classPrivateFieldInitSpec(this, _parameters, void 0);
			_classPrivateFieldInitSpec(this, _model, void 0);
			this.parameters = parameters;
		}
		get model() {
			return _classPrivateFieldGet2(_model, this);
		}
		get parameters() {
			return _classPrivateFieldGet2(_parameters, this);
		}
		set parameters(parameters) {
			const normalized = generatorParameters(parameters);
			_classPrivateFieldSet2(_parameters, this, new Proxy(normalized, this.params_handler_proxy()));
			this.rebuildModel();
			this.Scheduler = normalized.enable_short_term ? BasicScheduler : LongTermScheduler;
		}
		rebuildModel() {
			_classPrivateFieldSet2(_model, this, FSRS6Model.create({
				config: {
					weights: _classPrivateFieldGet2(_parameters, this).w,
					enableShortTerm: _classPrivateFieldGet2(_parameters, this).enable_short_term,
					numRelearningSteps: _classPrivateFieldGet2(_parameters, this).relearning_steps.length
				},
				bypass: true
			}));
		}
		params_handler_proxy() {
			const _this = this;
			return { set: (target, prop, value) => {
				if (prop === "enable_short_term") _this.Scheduler = value === true ? BasicScheduler : LongTermScheduler;
				else if (prop === "w") value = migrateFSRS6Parameters(value, target.relearning_steps.length, target.enable_short_term);
				Reflect.set(target, prop, value);
				if (prop === "enable_short_term" || prop === "w") _this.rebuildModel();
				return true;
			} };
		}
		useStrategy(mode, handler) {
			this.strategyHandler.set(mode, handler);
			return this;
		}
		clearStrategy(mode) {
			if (mode) this.strategyHandler.delete(mode);
			else this.strategyHandler.clear();
			return this;
		}
		getScheduler(card, now) {
			return new ((this.strategyHandler.get("Scheduler")) || this.Scheduler)(card, now, _classPrivateFieldGet2(_model, this), _classPrivateFieldGet2(_parameters, this), this.strategyHandler);
		}
		/**
		* Display the collection of cards and logs for the four scenarios after scheduling the card at the current time.
		* @param card Card to be processed
		* @param now Current time or scheduled time
		* @example
		* ```typescript
		* const card: Card = createEmptyCard(new Date());
		* const f = fsrs();
		* const recordLog = f.repeat(card, new Date());
		* ```
		*/
		repeat(card, now) {
			return this.getScheduler(card, now).preview();
		}
		/**
		* Display the collection of cards and logs for the card scheduled at the current time, after applying a specific grade rating.
		* @param card Card to be processed
		* @param now Current time or scheduled time
		* @param grade Rating of the review (Again, Hard, Good, Easy)
		* @example
		* ```typescript
		* const card: Card = createEmptyCard(new Date());
		* const f = fsrs();
		* const recordLogItem = f.next(card, new Date(), Rating.Again);
		* ```
		*/
		next(card, now, grade) {
			const instance = this.getScheduler(card, now);
			const g = TypeConvert.rating(grade);
			if (g === Rating.Manual) throw new FSRSValidationError("Cannot review a manual rating");
			return instance.review(g);
		}
		/**
		* Get the retrievability of the card
		* @param card  Card to be processed
		* @param now  Current time or scheduled time
		* @returns  The retrievability of the card
		*/
		retrievability(card, now) {
			const processedCard = TypeConvert.card(card);
			now = now ? TypeConvert.time(now) : /* @__PURE__ */ new Date();
			const t = processedCard.state !== State.New ? Math.max(date_diff(now, processedCard.last_review, "days"), 0) : 0;
			return processedCard.state !== State.New ? _classPrivateFieldGet2(_model, this).forgettingCurve(processedCard, t) : 0;
		}
		/**
		*
		* @param card Card to be processed
		* @param log last review log
		* @example
		* ```typescript
		* const now = new Date();
		* const f = fsrs();
		* const emptyCard = createEmptyCard(now);
		* const repeat = f.repeat(emptyCard, now);
		* const { card, log } = repeat[Rating.Hard];
		* const rollbackCard = f.rollback(card, log);
		* ```
		*/
		rollback(card, log) {
			const processedCard = TypeConvert.card(card);
			const processedLog = TypeConvert.review_log(log);
			if (processedLog.rating === Rating.Manual) throw new FSRSValidationError("Cannot rollback a manual rating");
			let last_due;
			let last_review;
			let last_lapses;
			switch (processedLog.state) {
				case State.New:
					last_due = processedLog.due;
					last_review = void 0;
					last_lapses = 0;
					break;
				case State.Learning:
				case State.Relearning:
				case State.Review:
					last_due = processedLog.review;
					last_review = processedLog.due;
					last_lapses = processedCard.lapses - (processedLog.rating === Rating.Again && processedLog.state === State.Review ? 1 : 0);
					break;
			}
			return _objectSpread2(_objectSpread2({}, processedCard), {}, {
				due: last_due,
				stability: processedLog.stability,
				difficulty: processedLog.difficulty,
				scheduled_days: processedLog.scheduled_days,
				reps: Math.max(0, processedCard.reps - 1),
				lapses: Math.max(0, last_lapses),
				learning_steps: processedLog.learning_steps,
				state: processedLog.state,
				last_review
			});
		}
		/**
		*
		* @param card Card to be processed
		* @param now Current time or scheduled time
		* @param reset_count Should the review count information(reps,lapses) be reset. (Optional)
		* @example
		* ```typescript
		* const now = new Date();
		* const f = fsrs();
		* const emptyCard = createEmptyCard(now);
		* const scheduling_cards = f.repeat(emptyCard, now);
		* const { card, log } = scheduling_cards[Rating.Hard];
		* const forgetCard = f.forget(card, new Date(), true);
		* ```
		*/
		forget(card, now, reset_count = false) {
			const processedCard = TypeConvert.card(card);
			now = TypeConvert.time(now);
			const scheduled_days = processedCard.state === State.New ? 0 : date_diff(now, processedCard.due, "days");
			const forget_log = {
				rating: Rating.Manual,
				state: processedCard.state,
				due: processedCard.due,
				stability: processedCard.stability,
				difficulty: processedCard.difficulty,
				scheduled_days,
				learning_steps: processedCard.learning_steps,
				review: now
			};
			return {
				card: _objectSpread2(_objectSpread2({}, processedCard), {}, {
					due: now,
					stability: 0,
					difficulty: 0,
					scheduled_days: 0,
					reps: reset_count ? 0 : processedCard.reps,
					lapses: reset_count ? 0 : processedCard.lapses,
					learning_steps: 0,
					state: State.New,
					last_review: processedCard.last_review
				}),
				log: forget_log
			};
		}
		/**
		* Reschedules the current card and returns the rescheduled collections and reschedule item.
		*
		* @param {CardInput | Card} current_card - The current card to be rescheduled.
		* @param {Array<FSRSHistory>} reviews - The array of FSRSHistory objects representing the reviews.
		* @param {Partial<RescheduleOptions>} options - The optional reschedule options.
		* @returns {IReschedule} - The rescheduled collections and reschedule item.
		*
		* @example
		* ```typescript
		* const f = fsrs()
		* const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
		* const reviews_at = [
		*   new Date(2024, 8, 13),
		*   new Date(2024, 8, 13),
		*   new Date(2024, 8, 17),
		*   new Date(2024, 8, 28),
		* ]
		*
		* const reviews: FSRSHistory[] = []
		* for (let i = 0; i < grades.length; i++) {
		*   reviews.push({
		*     rating: grades[i],
		*     review: reviews_at[i],
		*   })
		* }
		*
		* const results_short = scheduler.reschedule(
		*   createEmptyCard(),
		*   reviews,
		*   {
		*     skipManual: false,
		*   }
		* )
		* console.log(results_short)
		* ```
		*/
		reschedule(current_card, reviews = [], options = {}) {
			const { reviewsOrderBy, skipManual = true, now = /* @__PURE__ */ new Date(), update_memory_state: updateMemoryState = false } = options;
			if (reviewsOrderBy && typeof reviewsOrderBy === "function") reviews.sort(reviewsOrderBy);
			if (skipManual) reviews = reviews.filter((review) => review.rating !== Rating.Manual);
			const rescheduleSvc = new Reschedule(this);
			const collections = rescheduleSvc.reschedule(options.first_card || createEmptyCard(), reviews);
			const len = collections.length;
			const cur_card = TypeConvert.card(current_card);
			const manual_item = rescheduleSvc.calculateManualRecord(cur_card, now, len ? collections[len - 1] : void 0, updateMemoryState);
			return {
				collections,
				reschedule_item: manual_item !== null && manual_item !== void 0 ? manual_item : null
			};
		}
	};
	/**
	* Create a new instance of TS-FSRS
	* @deprecated This function will be removed after all tests are migrated and passing.
	* Use Scheduler going forward.
	* @param params FSRSParameters
	* @example
	* ```typescript
	* const f = fsrs();
	* ```
	* @example
	* ```typescript
	* const params: FSRSParameters = generatorParameters({ maximum_interval: 1000 });
	* const f = fsrs(params);
	* ```
	* @example
	* ```typescript
	* const f = fsrs({ maximum_interval: 1000 });
	* ```
	*/
	const fsrs = (params) => {
		return new FSRS(params || {});
	};

//#endregion
//#region src/middlewares/desired-retention/schema.ts
	init_esm();
	const desiredRetentionConfigSchema = defineSchema((value) => {
		if (!isObject$1(value) || typeof value.desiredRetention !== "number" || !Number.isFinite(value.desiredRetention) || value.desiredRetention <= 0 || value.desiredRetention > 1) return { issues: [{ message: "Expected desiredRetention in (0, 1]" }] };
		return { value: { desiredRetention: value.desiredRetention } };
	});

//#endregion
//#region src/middlewares/desired-retention/middleware.ts
	init_esm();
	const schedulerDesiredRetentionMiddleware = defineMiddleware({
		name: Symbol("ts-fsrs.desired-retention"),
		schema: { config: desiredRetentionConfigSchema },
		handlers: { review(ctx, next) {
			ctx.desiredRetention = ctx.config.desiredRetention;
			next();
		} }
	});

//#endregion
//#region src/middlewares/fuzzing/card-id.ts
	function createCardId() {
		const crypto = globalThis.crypto;
		if (typeof (crypto === null || crypto === void 0 ? void 0 : crypto.randomUUID) === "function") return crypto.randomUUID();
		const bytes = /* @__PURE__ */ new Uint8Array(16);
		if (typeof (crypto === null || crypto === void 0 ? void 0 : crypto.getRandomValues) === "function") crypto.getRandomValues(bytes);
		else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
		bytes[6] = bytes[6] & 15 | 64;
		bytes[8] = bytes[8] & 63 | 128;
		const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}

//#endregion
//#region src/middlewares/fuzzing/schema.ts
	init_esm();
	function parseCardId(value) {
		if (typeof value === "string" && value.length > 0) return value;
		if (typeof value === "number" && Number.isFinite(value)) return value;
	}
	const fuzzingConfigSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected fuzzing config object" }] };
		const { enableFuzz, maximumInterval } = value;
		if (typeof enableFuzz !== "boolean") return { issues: [{ message: "Expected enableFuzz boolean" }] };
		if (typeof maximumInterval !== "number" || !Number.isInteger(maximumInterval) || maximumInterval <= 0) return { issues: [{ message: "Expected positive integer maximumInterval" }] };
		return { value: {
			enableFuzz,
			maximumInterval
		} };
	});
	const fuzzingCardInitInputSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected fuzzing card init input object" }] };
		if (value.cardId === void 0) return { value: {} };
		const cardId = parseCardId(value.cardId);
		return cardId === void 0 ? { issues: [{ message: "Expected new card cardId" }] } : { value: { cardId } };
	});
	const fuzzingCardFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected card cardId" }] };
		const cardId = parseCardId(value.cardId);
		if (cardId === void 0) return { issues: [{ message: "Expected card cardId" }] };
		const { reps } = value;
		if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 0) return { issues: [{ message: "Expected non-negative integer reps" }] };
		return { value: {
			cardId,
			reps
		} };
	});
	const fuzzingRevlogFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected revlog cardId" }] };
		const cardId = parseCardId(value.cardId);
		return cardId === void 0 ? { issues: [{ message: "Expected revlog cardId" }] } : { value: { cardId } };
	});

//#endregion
//#region src/middlewares/fuzzing/middleware.ts
	init_esm();
	const fuzzingDecoratorSymbol = Symbol("ts-fsrs.fuzzing.decorator");
	function createSchedulerFuzzingMiddleware(options = {}) {
		const { fuzzingRange = FUZZ_RANGES, rng = fnv1aMulberry32Rng } = options;
		return defineMiddleware({
			name: Symbol("ts-fsrs.fuzzing"),
			schema: {
				config: fuzzingConfigSchema,
				cardInitInput: fuzzingCardInitInputSchema,
				card: fuzzingCardFieldsSchema,
				revlog: fuzzingRevlogFieldsSchema
			},
			defaultValue: { card(ctx) {
				var _ctx$input$cardId;
				if (ctx.operation === "forget") return {
					cardId: ctx.input.cardId,
					reps: ctx.config.clearStatsOnForget === false ? ctx.input.reps : 0
				};
				return {
					cardId: (_ctx$input$cardId = ctx.input.cardId) !== null && _ctx$input$cardId !== void 0 ? _ctx$input$cardId : createCardId(),
					reps: 0
				};
			} },
			handlers: {
				review(ctx, next) {
					var _ctx$result$card$reps2, _ctx$result$card2, _ctx$result$card2$rep;
					const card = ctx.input.card;
					if (!ctx.config.enableFuzz) {
						var _ctx$result$card, _ctx$result$card$reps;
						next();
						ctx.result.card.cardId = card.cardId;
						(_ctx$result$card$reps = (_ctx$result$card = ctx.result.card).reps) !== null && _ctx$result$card$reps !== void 0 || (_ctx$result$card.reps = card.reps + 1);
						ctx.result.revlog.cardId = card.cardId;
						return;
					}
					const reps = (_ctx$result$card$reps2 = ctx.result.card.reps) !== null && _ctx$result$card$reps2 !== void 0 ? _ctx$result$card$reps2 : card.reps + 1;
					const candidate = ctx.candidate;
					if (!candidate[fuzzingDecoratorSymbol]) {
						const nextInterval = candidate.nextInterval;
						const seed = `${card.cardId}${reps}`;
						candidate.nextInterval = (memoryState, desiredRetention) => {
							const interval = nextInterval(memoryState, desiredRetention);
							if (interval < 2.5) return Math.round(interval);
							const { minInterval, maxInterval } = getFuzzRange(interval, ctx.elapsedDays, ctx.config.maximumInterval, fuzzingRange);
							const fuzzFactor = rng(seed)();
							return Math.floor(fuzzFactor * (maxInterval - minInterval + 1) + minInterval);
						};
						candidate[fuzzingDecoratorSymbol] = true;
					}
					ctx.scheduledDays = void 0;
					next();
					ctx.result.card.cardId = card.cardId;
					(_ctx$result$card2$rep = (_ctx$result$card2 = ctx.result.card).reps) !== null && _ctx$result$card2$rep !== void 0 || (_ctx$result$card2.reps = reps);
					ctx.result.revlog.cardId = card.cardId;
				},
				rollback(ctx, next) {
					var _ctx$result$card3, _ctx$result$card3$rep;
					next();
					ctx.result.card.cardId = ctx.input.revlog.cardId;
					(_ctx$result$card3$rep = (_ctx$result$card3 = ctx.result.card).reps) !== null && _ctx$result$card3$rep !== void 0 || (_ctx$result$card3.reps = Math.max(0, ctx.input.card.reps - 1));
				}
			}
		});
	}
	const schedulerFuzzingMiddleware = createSchedulerFuzzingMiddleware();

//#endregion
//#region src/middlewares/learning-steps/middleware.ts
	init_esm();
	const MINUTES_PER_DAY = 1440;
	const resolvedStepsSymbol = Symbol("ts-fsrs.learning-steps.resolved");
	const schedulerLearningStepsMiddleware = defineMiddleware({
		name: Symbol("ts-fsrs.learning-steps"),
		schema: {
			config: learningStepsConfigSchema,
			card: learningStepFieldsSchema,
			revlog: learningStepFieldsSchema
		},
		defaultValue: { card() {
			return { learningStep: 0 };
		} },
		handlers: {
			review(ctx, next) {
				const card = ctx.input.card;
				if (!ctx.config.enableShortTerm) {
					next();
					ctx.result.revlog.learningStep = card.learningStep;
					ctx.result.card.learningStep = 0;
					return;
				}
				const candidate = ctx.candidate;
				let resolved = candidate[resolvedStepsSymbol];
				if (!resolved) {
					resolved = {
						steps: calculateLearningSteps(ctx.config, card.state, card.learningStep),
						scheduledMinutes: {}
					};
					candidate[resolvedStepsSymbol] = resolved;
					const resolvedSteps = resolved;
					const nextInterval = candidate.nextInterval;
					candidate.nextInterval = (memoryState, desiredRetention) => {
						const grade = candidate.findGrade(memoryState);
						if (grade === void 0) return nextInterval(memoryState, desiredRetention);
						const step = resolvedSteps.steps[grade];
						const scheduledMinutes = step ? getScheduledMinutes(resolvedSteps, grade, step) : void 0;
						if (scheduledMinutes !== void 0 && scheduledMinutes > 0) return scheduledMinutes / MINUTES_PER_DAY;
						return nextInterval(memoryState, desiredRetention);
					};
				}
				const step = resolved.steps[ctx.input.grade];
				const scheduledMinutes = step ? getScheduledMinutes(resolved, ctx.input.grade, step) : void 0;
				next();
				if (scheduledMinutes !== void 0 && scheduledMinutes > 0) ctx.scheduledDays = scheduledMinutes / MINUTES_PER_DAY;
				ctx.result.revlog.learningStep = card.learningStep;
				ctx.result.card.learningStep = 0;
				if (step && scheduledMinutes !== void 0) {
					if (scheduledMinutes > 0 && scheduledMinutes < MINUTES_PER_DAY) {
						ctx.result.card.learningStep = Math.max(0, step.nextStep);
						ctx.result.card.state = nextLearningState(card.state);
						ctx.result.card.scheduleStatus = "learning";
					} else if (scheduledMinutes >= MINUTES_PER_DAY) {
						ctx.result.card.learningStep = Math.max(0, step.nextStep);
						ctx.result.card.state = State.Review;
						ctx.result.card.scheduleStatus = "review";
					}
				}
			},
			rollback(ctx, next) {
				next();
				ctx.result.card.learningStep = ctx.input.revlog.learningStep;
			}
		}
	});
	function nextLearningState(state) {
		if (state === State.New) return State.Learning;
		if (state === State.Review) return State.Relearning;
		return state;
	}
	function getScheduledMinutes(resolved, grade, step) {
		const cached = resolved.scheduledMinutes[grade];
		if (cached !== void 0) return cached;
		const scheduledMinutes = Math.round(Math.max(0, step.scheduledMinutes));
		resolved.scheduledMinutes[grade] = scheduledMinutes;
		return scheduledMinutes;
	}

//#endregion
//#region src/middlewares/leech/schema.ts
	init_esm();
	const DEFAULT_LEECH_THRESHOLD = 0;
	const leechConfigSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected leech config object" }] };
		const leechThreshold = value.leechThreshold === void 0 ? 0 : value.leechThreshold;
		if (typeof leechThreshold !== "number" || !Number.isInteger(leechThreshold) || leechThreshold < 0) return { issues: [{ message: "Expected non-negative integer leechThreshold" }] };
		return { value: { leechThreshold } };
	});
	const leechCardFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected leech card fields" }] };
		const { lapses } = value;
		if (typeof lapses !== "number" || !Number.isInteger(lapses) || lapses < 0) return { issues: [{ message: "Expected non-negative integer lapses" }] };
		return { value: { lapses } };
	});

//#endregion
//#region src/middlewares/leech/middleware.ts
	init_esm();
	/** Register before middleware that writes scheduleStatus after next(). */
	const schedulerLeechMiddleware = defineMiddleware({
		name: Symbol("ts-fsrs.leech"),
		scheduleStatus: ["suspended"],
		schema: {
			config: leechConfigSchema,
			card: leechCardFieldsSchema
		},
		defaultValue: { card(ctx) {
			return { lapses: ctx.operation === "forget" && ctx.config.clearStatsOnForget === false ? ctx.input.lapses : 0 };
		} },
		handlers: {
			review(ctx, next) {
				var _ctx$result$card, _ctx$result$card$laps;
				next();
				const card = ctx.input.card;
				const isLapse = card.state === State.Review && ctx.input.grade === Rating.Again;
				(_ctx$result$card$laps = (_ctx$result$card = ctx.result.card).lapses) !== null && _ctx$result$card$laps !== void 0 || (_ctx$result$card.lapses = isLapse ? card.lapses + 1 : card.lapses);
				const { lapses } = ctx.result.card;
				const { leechThreshold } = ctx.config;
				if (isLapse && leechThreshold > 0 && lapses % leechThreshold === 0) ctx.result.card.scheduleStatus = "suspended";
			},
			rollback(ctx, next) {
				var _ctx$result$card2, _ctx$result$card2$lap;
				next();
				const card = ctx.input.card;
				const revlog = ctx.input.revlog;
				const isLapse = revlog.rating === Rating.Again && revlog.state === State.Review;
				(_ctx$result$card2$lap = (_ctx$result$card2 = ctx.result.card).lapses) !== null && _ctx$result$card2$lap !== void 0 || (_ctx$result$card2.lapses = Math.max(0, card.lapses - (isLapse ? 1 : 0)));
			}
		}
	});

//#endregion
//#region src/middlewares/monotonic-interval/schema.ts
	init_esm();
	const DEFAULT_MAXIMUM_INTERVAL = 36500;
	const monotonicIntervalConfigSchema = defineSchema((value) => {
		if (!isObject$1(value)) return { issues: [{ message: "Expected monotonic interval config" }] };
		const maximumInterval = value.maximumInterval === void 0 ? DEFAULT_MAXIMUM_INTERVAL : value.maximumInterval;
		if (typeof maximumInterval !== "number" || !Number.isInteger(maximumInterval) || maximumInterval <= 0) return { issues: [{ message: "Expected positive integer maximumInterval" }] };
		return { value: { maximumInterval } };
	});

//#endregion
//#region src/middlewares/maximum-interval/middleware.ts
	init_esm();
	/** Register after learning steps so explicit steps can keep their exact delay. */
	const schedulerMaximumIntervalMiddleware = defineMiddleware({
		name: Symbol("ts-fsrs.maximum-interval"),
		schema: { config: monotonicIntervalConfigSchema },
		handlers: { review(ctx, next) {
			next();
			if (ctx.scheduledDays !== void 0) ctx.scheduledDays = Math.min(ctx.scheduledDays, ctx.config.maximumInterval);
		} }
	});

//#endregion
//#region src/middlewares/monotonic-interval/middleware.ts
	init_esm();
	/** Register after fuzzing and learning steps, when present. */
	const schedulerMonotonicIntervalMiddleware = defineMiddleware({
		name: Symbol("ts-fsrs.monotonic-interval"),
		schema: { config: monotonicIntervalConfigSchema },
		handlers: { review(ctx, next) {
			const { grade } = ctx.input;
			const interval = (rating) => ctx.candidate.nextInterval(ctx.candidate.step(rating), ctx.desiredRetention);
			const schedule = (...candidates) => calculateScheduleDay(candidates, ctx.config.maximumInterval);
			next();
			const scheduledDays = ctx.scheduledDays;
			switch (grade) {
				case Rating.Again:
					ctx.scheduledDays = schedule(scheduledDays);
					break;
				case Rating.Hard:
					ctx.scheduledDays = schedule(interval(Rating.Again), scheduledDays);
					break;
				case Rating.Good:
					ctx.scheduledDays = schedule(interval(Rating.Again), interval(Rating.Hard), scheduledDays);
					break;
				case Rating.Easy:
					ctx.scheduledDays = schedule(interval(Rating.Again), interval(Rating.Hard), interval(Rating.Good), scheduledDays);
					break;
			}
		} }
	});

//#endregion
//#region src/middlewares/scheduled-days/schema.ts
	init_esm();
	const scheduledDaysFieldsSchema = defineSchema((value) => {
		if (!isObject$1(value) || typeof value.scheduledDays !== "number" || !Number.isFinite(value.scheduledDays)) return { issues: [{ message: "Expected finite scheduledDays" }] };
		return { value: { scheduledDays: value.scheduledDays } };
	});

//#endregion
//#region src/middlewares/scheduled-days/middleware.ts
	init_esm();
	/** Register before interval middleware so it records their final value on unwind. */
	const schedulerScheduledDaysMiddleware = defineMiddleware({
		name: Symbol("ts-fsrs.scheduled-days"),
		schema: {
			card: scheduledDaysFieldsSchema,
			revlog: scheduledDaysFieldsSchema
		},
		defaultValue: { card() {
			return { scheduledDays: 0 };
		} },
		handlers: {
			review(ctx, next) {
				var _ctx$scheduledDays;
				const previousScheduledDays = ctx.input.card.scheduledDays;
				next();
				ctx.result.card.scheduledDays = Math.max(0, Math.floor((_ctx$scheduledDays = ctx.scheduledDays) !== null && _ctx$scheduledDays !== void 0 ? _ctx$scheduledDays : 0));
				ctx.result.revlog.scheduledDays = previousScheduledDays;
			},
			rollback(ctx, next) {
				next();
				ctx.result.card.scheduledDays = ctx.input.revlog.scheduledDays;
			}
		}
	});

//#endregion
//#region src/models/fsrs-3/algorithm.ts
	function forgetting_curve$3(elapsed_days, stability) {
		return roundTo(Math.pow(.9, elapsed_days / stability), 8);
	}
	var FSRS3Algorithm;
	var init_algorithm$3 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_defineProperty();
		FSRS3Algorithm = class {
			constructor(weights, bounds) {
				this.weights = weights;
				this.bounds = bounds;
				_defineProperty(this, "forgetting_curve", forgetting_curve$3);
				if (!Array.isArray(weights) || weights.length !== 13) throw new FSRSValidationError(`FSRS3Algorithm requires exactly 13 weights, but received ${weights === null || weights === void 0 ? void 0 : weights.length}`);
			}
			init_stability(g) {
				const w = this.weights;
				return clamp(w[0] + (g - 1) * w[1], this.bounds.sMin, this.bounds.sMax);
			}
			init_difficulty(g) {
				const w = this.weights;
				return clamp(w[2] + (g - 3) * w[3], this.bounds.dMin, this.bounds.dMax);
			}
			next_interval(s, desired_retention) {
				if (!Number.isFinite(desired_retention) || desired_retention <= 0 || desired_retention > 1) throw new FSRSValidationError("Desired retention rate should be in the range (0,1]");
				const intervalModifier = Math.log(desired_retention) / Math.log(.9);
				return roundTo(Math.max(Math.round(s * intervalModifier), 1), 8);
			}
			next_difficulty(d, g) {
				const w = this.weights;
				const next_d = d + w[4] * (g - 3);
				return roundTo(clamp(this.mean_reversion(w[2], next_d), this.bounds.dMin, this.bounds.dMax), 8);
			}
			mean_reversion(init, current) {
				const w = this.weights;
				return roundTo(w[5] * init + (1 - w[5]) * current, 8);
			}
			next_recall_stability(d, s, r) {
				const w = this.weights;
				return roundTo(clamp(s * (1 + Math.exp(w[6]) * (11 - d) * Math.pow(s, w[7]) * (Math.exp((1 - r) * w[8]) - 1)), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_forget_stability(d, s, r) {
				const w = this.weights;
				return roundTo(clamp(w[9] * Math.pow(d, w[10]) * Math.pow(s, w[11]) * Math.exp((1 - r) * w[12]), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_state(memory_state, t, g, r) {
				const { difficulty: d, stability: s } = memory_state !== null && memory_state !== void 0 ? memory_state : {
					difficulty: 0,
					stability: 0
				};
				if (t < 0) throw new FSRSValidationError(`Invalid delta_t "${t}"`);
				if (g < 0 || g > 4) throw new FSRSValidationError(`Invalid grade "${g}"`);
				if (g === Rating.Manual) return {
					difficulty: d,
					stability: s
				};
				const grade = g;
				if (d === 0 && s === 0) return {
					difficulty: this.init_difficulty(grade),
					stability: this.init_stability(grade)
				};
				if (d < this.bounds.dMin || s < this.bounds.sMin) throw new FSRSValidationError(`Invalid memory state { difficulty: ${d}, stability: ${s} }`);
				r = typeof r === "number" ? r : this.forgetting_curve(t, s);
				const new_d = this.next_difficulty(d, grade);
				return {
					difficulty: new_d,
					stability: grade === Rating.Again ? this.next_forget_stability(new_d, s, r) : this.next_recall_stability(new_d, s, r)
				};
			}
		};
	}));

//#endregion
//#region src/models/fsrs-3/constants.ts
	var FSRS3_MODEL_BOUNDS, FSRS3_DEFAULT_WEIGHTS, FSRS3ParameterBounds;
	var init_constants$2 = __esmMin((() => {
		FSRS3_MODEL_BOUNDS = Object.freeze({
			sMin: .01,
			sMax: 36500,
			dMin: 1,
			dMax: 10
		});
		FSRS3_DEFAULT_WEIGHTS = Object.freeze([
			.9605,
			1.7234,
			4.8527,
			-1.1917,
			-1.2956,
			.0573,
			1.7352,
			-.1673,
			1.065,
			1.8907,
			-.3832,
			.5867,
			1.0721
		]);
		FSRS3ParameterBounds = () => [
			[.1, 10],
			[.1, 5],
			[FSRS3_MODEL_BOUNDS.dMin, FSRS3_MODEL_BOUNDS.dMax],
			[-5, -.1],
			[-5, -.1],
			[.05, .5],
			[0, 2],
			[-.8, -.15],
			[.01, 1.5],
			[.5, 5],
			[-2, -.01],
			[.01, .9],
			[.01, 2]
		];
	}));

//#endregion
//#region src/models/fsrs-3/parameters.ts
	var clipFSRS3Parameters, checkFSRS3Parameters, migrateFSRS3Parameters, fsrs3ConfigSchema;
	var init_parameters$3 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_schema_utils();
		init_constants$2();
		clipFSRS3Parameters = (parameters) => {
			return FSRS3ParameterBounds().map(([min, max], index) => {
				var _parameters$index;
				return clamp((_parameters$index = parameters[index]) !== null && _parameters$index !== void 0 ? _parameters$index : FSRS3_DEFAULT_WEIGHTS[index], min, max);
			});
		};
		checkFSRS3Parameters = (parameters) => {
			const clipped = clipFSRS3Parameters(Array.from(parameters));
			if (!(parameters.length === FSRS3_DEFAULT_WEIGHTS.length && clipped.every((value, index) => value === parameters[index]))) throw new FSRSValidationError("Expected FSRS3 weights within model bounds.");
			return parameters;
		};
		migrateFSRS3Parameters = (parameters) => {
			if (!Array.isArray(parameters) || parameters.length === 0) return [...FSRS3_DEFAULT_WEIGHTS];
			return clipFSRS3Parameters(parameters);
		};
		fsrs3ConfigSchema = defineSchema((value) => {
			if (isObject$1(value) && isNumberArray(value.weights)) return { value: { weights: value.weights } };
			return { issues: [{ message: "Expected FSRS3 config" }] };
		});
	}));

//#endregion
//#region src/models/fsrs-3/model.ts
	var createFSRS3Model, FSRS3Model;
	var init_model$3 = __esmMin((() => {
		init_esm();
		init_kit();
		init_algorithm$3();
		init_constants$2();
		init_parameters$3();
		createFSRS3Model = (config) => {
			const bounds = FSRS3_MODEL_BOUNDS;
			const algo = new FSRS3Algorithm(config.weights, bounds);
			const step = ({ memoryState, rating, elapsedDays, retrievability }) => {
				return algo.next_state(memoryState, elapsedDays, rating, retrievability);
			};
			const nextInterval = (memoryState, desiredRetention) => {
				return algo.next_interval(memoryState.stability, desiredRetention);
			};
			const forgettingCurve = (memoryState, elapsedDays) => {
				return algo.forgetting_curve(elapsedDays, memoryState.stability);
			};
			const forward = ({ history, initialState }) => {
				const states = [];
				let memoryState = initialState || null;
				for (const review of history) {
					memoryState = step({
						memoryState,
						rating: review.rating,
						elapsedDays: review.deltaT
					});
					states.push(memoryState);
				}
				return states;
			};
			return {
				config,
				bounds,
				algorithm: algo,
				step,
				nextInterval,
				forgettingCurve,
				forward
			};
		};
		FSRS3Model = defineModel({
			name: "fsrs-3",
			schema: {
				config: fsrs3ConfigSchema,
				memoryState: FSRSMemoryStateSchema
			},
			defaultValue: { memoryState() {
				return {
					stability: 0,
					difficulty: 0
				};
			} },
			create({ config, migrate = true, check = true, bypass = false }) {
				if (bypass) return createFSRS3Model(config);
				const weights = migrate ? migrateFSRS3Parameters(config.weights) : config.weights;
				if (check) checkFSRS3Parameters(weights);
				const $config = fsrs3ConfigSchema.parse({ weights });
				return createFSRS3Model(Object.freeze($config));
			}
		});
	}));

//#endregion
//#region src/models/fsrs-3/index.ts
	var fsrs_3_exports = /* @__PURE__ */ __exportAll({
		FSRS3Algorithm: () => FSRS3Algorithm,
		FSRS3Model: () => FSRS3Model,
		FSRS3ParameterBounds: () => FSRS3ParameterBounds,
		FSRS3_DEFAULT_WEIGHTS: () => FSRS3_DEFAULT_WEIGHTS,
		FSRS3_MODEL_BOUNDS: () => FSRS3_MODEL_BOUNDS,
		checkFSRS3Parameters: () => checkFSRS3Parameters,
		clipFSRS3Parameters: () => clipFSRS3Parameters,
		forgettingCurve: () => forgetting_curve$3,
		fsrs3ConfigSchema: () => fsrs3ConfigSchema,
		migrateFSRS3Parameters: () => migrateFSRS3Parameters
	});
	var init_fsrs_3 = __esmMin((() => {
		init_algorithm$3();
		init_constants$2();
		init_model$3();
		init_parameters$3();
	}));

//#endregion
//#region src/models/fsrs-4/algorithm.ts
	function forgetting_curve$2(elapsed_days, stability) {
		return roundTo(Math.pow(1 + elapsed_days / (9 * stability), -1), 8);
	}
	var FSRS4Algorithm;
	var init_algorithm$2 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_defineProperty();
		FSRS4Algorithm = class {
			constructor(weights, bounds) {
				this.weights = weights;
				this.bounds = bounds;
				_defineProperty(this, "forgetting_curve", forgetting_curve$2);
				if (!Array.isArray(weights) || weights.length !== 17) throw new FSRSValidationError(`FSRS4Algorithm requires exactly 17 weights, but received ${weights === null || weights === void 0 ? void 0 : weights.length}`);
			}
			init_stability(g) {
				return clamp(this.weights[g - 1], this.bounds.sMin, this.bounds.sMax);
			}
			init_difficulty(g) {
				const w = this.weights;
				return clamp(roundTo(w[4] - (g - 3) * w[5], 8), this.bounds.dMin, this.bounds.dMax);
			}
			next_interval(s, desired_retention) {
				if (!Number.isFinite(desired_retention) || desired_retention <= 0 || desired_retention > 1) throw new FSRSValidationError("Requested retention rate should be in the range (0,1]");
				const intervalModifier = roundTo(9 * (1 / desired_retention - 1), 8);
				return Math.max(Math.round(s * intervalModifier), 1);
			}
			next_difficulty(d, g) {
				const next_d = d - this.weights[6] * (g - 3);
				return clamp(this.mean_reversion(this.weights[4], next_d), this.bounds.dMin, this.bounds.dMax);
			}
			mean_reversion(init, current) {
				const w = this.weights;
				return roundTo(w[7] * init + (1 - w[7]) * current, 8);
			}
			next_recall_stability(d, s, r, g) {
				const w = this.weights;
				const hard_penalty = Rating.Hard === g ? w[15] : 1;
				const easy_bound = Rating.Easy === g ? w[16] : 1;
				return roundTo(clamp(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard_penalty * easy_bound), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_forget_stability(d, s, r) {
				const w = this.weights;
				return roundTo(clamp(w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_state(memory_state, t, g, r) {
				const { difficulty: d, stability: s } = memory_state !== null && memory_state !== void 0 ? memory_state : {
					difficulty: 0,
					stability: 0
				};
				if (t < 0) throw new FSRSValidationError(`Invalid delta_t "${t}"`);
				if (g < 0 || g > 4) throw new FSRSValidationError(`Invalid grade "${g}"`);
				if (g === Rating.Manual) return {
					difficulty: d,
					stability: s
				};
				const grade = g;
				if (d === 0 && s === 0) return {
					difficulty: this.init_difficulty(grade),
					stability: this.init_stability(grade)
				};
				if (d < this.bounds.dMin || s < this.bounds.sMin) throw new FSRSValidationError(`Invalid memory state { difficulty: ${d}, stability: ${s} }`);
				r = typeof r === "number" ? r : this.forgetting_curve(t, s);
				const new_s = grade === Rating.Again ? this.next_forget_stability(d, s, r) : this.next_recall_stability(d, s, r, grade);
				return {
					difficulty: this.next_difficulty(d, grade),
					stability: new_s
				};
			}
		};
	}));

//#endregion
//#region src/models/fsrs-4/constants.ts
	var FSRS4_MODEL_BOUNDS, FSRS4_DEFAULT_WEIGHTS, FSRS4ParameterBounds;
	var init_constants$1 = __esmMin((() => {
		FSRS4_MODEL_BOUNDS = Object.freeze({
			sMin: .01,
			sMax: 36500,
			dMin: 1,
			dMax: 10
		});
		FSRS4_DEFAULT_WEIGHTS = Object.freeze([
			.4,
			.9,
			2.3,
			10.9,
			4.93,
			.94,
			.86,
			.01,
			1.49,
			.14,
			.94,
			2.18,
			.05,
			.34,
			1.26,
			.29,
			2.61
		]);
		FSRS4ParameterBounds = () => [
			[FSRS4_MODEL_BOUNDS.sMin, FSRS4_MODEL_BOUNDS.sMax],
			[FSRS4_MODEL_BOUNDS.sMin, FSRS4_MODEL_BOUNDS.sMax],
			[FSRS4_MODEL_BOUNDS.sMin, FSRS4_MODEL_BOUNDS.sMax],
			[FSRS4_MODEL_BOUNDS.sMin, FSRS4_MODEL_BOUNDS.sMax],
			[1, 10],
			[.1, 5],
			[.1, 5],
			[0, .5],
			[0, 3],
			[.1, .8],
			[.01, 2.5],
			[.5, 5],
			[.01, .2],
			[.01, .9],
			[.01, 2],
			[0, 1],
			[1, 4]
		];
	}));

//#endregion
//#region src/models/fsrs-4/parameters.ts
	var clipFSRS4Parameters, checkFSRS4Parameters, migrateFSRS4Parameters, fsrs4ConfigSchema;
	var init_parameters$2 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_schema_utils();
		init_constants$1();
		clipFSRS4Parameters = (parameters) => {
			return FSRS4ParameterBounds().map(([min, max], index) => {
				var _parameters$index;
				return clamp((_parameters$index = parameters[index]) !== null && _parameters$index !== void 0 ? _parameters$index : FSRS4_DEFAULT_WEIGHTS[index], min, max);
			});
		};
		checkFSRS4Parameters = (parameters) => {
			const clipped = clipFSRS4Parameters(Array.from(parameters));
			if (!(parameters.length === FSRS4_DEFAULT_WEIGHTS.length && clipped.every((value, index) => value === parameters[index]))) throw new FSRSValidationError("Expected FSRS4 weights within model bounds.");
			return parameters;
		};
		migrateFSRS4Parameters = (parameters) => {
			if (!Array.isArray(parameters) || parameters.length === 0) return [...FSRS4_DEFAULT_WEIGHTS];
			return clipFSRS4Parameters(parameters);
		};
		fsrs4ConfigSchema = defineSchema((value) => {
			if (isObject$1(value) && isNumberArray(value.weights)) return { value: { weights: value.weights } };
			return { issues: [{ message: "Expected FSRS4 config" }] };
		});
	}));

//#endregion
//#region src/models/fsrs-4/model.ts
	var createFSRS4Model, FSRS4Model;
	var init_model$2 = __esmMin((() => {
		init_esm();
		init_kit();
		init_algorithm$2();
		init_constants$1();
		init_parameters$2();
		createFSRS4Model = (config) => {
			const bounds = FSRS4_MODEL_BOUNDS;
			const algo = new FSRS4Algorithm(config.weights, FSRS4_MODEL_BOUNDS);
			const step = ({ memoryState, rating, elapsedDays, retrievability }) => {
				return algo.next_state(memoryState, elapsedDays, rating, retrievability);
			};
			const nextInterval = (memoryState, desiredRetention) => {
				return algo.next_interval(memoryState.stability, desiredRetention);
			};
			const forgettingCurve = (memoryState, elapsedDays) => {
				return algo.forgetting_curve(elapsedDays, memoryState.stability);
			};
			const forward = ({ history, initialState }) => {
				const states = [];
				let memoryState = initialState || null;
				for (const review of history) {
					memoryState = step({
						memoryState,
						rating: review.rating,
						elapsedDays: review.deltaT
					});
					states.push(memoryState);
				}
				return states;
			};
			return {
				config,
				bounds,
				algorithm: algo,
				step,
				nextInterval,
				forgettingCurve,
				forward
			};
		};
		FSRS4Model = defineModel({
			name: "fsrs-4",
			schema: {
				config: fsrs4ConfigSchema,
				memoryState: FSRSMemoryStateSchema
			},
			defaultValue: { memoryState() {
				return {
					stability: 0,
					difficulty: 0
				};
			} },
			create({ config, migrate = true, check = true, bypass = false }) {
				if (bypass) return createFSRS4Model(config);
				const weights = migrate ? migrateFSRS4Parameters(config.weights) : config.weights;
				if (check) checkFSRS4Parameters(weights);
				const $config = fsrs4ConfigSchema.parse({ weights });
				return createFSRS4Model(Object.freeze($config));
			}
		});
	}));

//#endregion
//#region src/models/fsrs-4/index.ts
	var fsrs_4_exports = /* @__PURE__ */ __exportAll({
		FSRS4Algorithm: () => FSRS4Algorithm,
		FSRS4Model: () => FSRS4Model,
		FSRS4_DEFAULT_WEIGHTS: () => FSRS4_DEFAULT_WEIGHTS,
		FSRS4_MODEL_BOUNDS: () => FSRS4_MODEL_BOUNDS,
		checkFSRS4Parameters: () => checkFSRS4Parameters,
		clipFSRS4Parameters: () => clipFSRS4Parameters,
		forgettingCurve: () => forgetting_curve$2,
		fsrs4ConfigSchema: () => fsrs4ConfigSchema,
		migrateFSRS4Parameters: () => migrateFSRS4Parameters
	});
	var init_fsrs_4 = __esmMin((() => {
		init_algorithm$2();
		init_constants$1();
		init_model$2();
		init_parameters$2();
	}));

//#endregion
//#region src/models/fsrs-4dot5/constants.ts
	var FSRS4Dot5_DECAY, FSRS4Dot5_FACTOR, INIT_S_MAX$1, FSRS4Dot5_MODEL_BOUNDS, FSRS4Dot5_DEFAULT_WEIGHTS, FSRS4Dot5ParameterBounds;
	var init_constants = __esmMin((() => {
		FSRS4Dot5_DECAY = .5;
		FSRS4Dot5_FACTOR = 19 / 81;
		INIT_S_MAX$1 = 100;
		FSRS4Dot5_MODEL_BOUNDS = Object.freeze({
			sMin: .01,
			sMax: 36500,
			dMin: 1,
			dMax: 10
		});
		FSRS4Dot5_DEFAULT_WEIGHTS = Object.freeze([
			.4872,
			1.4003,
			3.7145,
			13.8206,
			5.1618,
			1.2298,
			.8975,
			.031,
			1.6474,
			.1367,
			1.0461,
			2.1072,
			.0793,
			.3246,
			1.587,
			.2272,
			2.8755
		]);
		FSRS4Dot5ParameterBounds = () => [
			[FSRS4Dot5_MODEL_BOUNDS.sMin, 100],
			[FSRS4Dot5_MODEL_BOUNDS.sMin, 100],
			[FSRS4Dot5_MODEL_BOUNDS.sMin, 100],
			[FSRS4Dot5_MODEL_BOUNDS.sMin, 100],
			[0, FSRS4Dot5_MODEL_BOUNDS.dMax],
			[.01, 5],
			[.01, 5],
			[0, .8],
			[0, 6],
			[0, .8],
			[.01, 5],
			[.2, 6],
			[.01, .4],
			[.01, .9],
			[.01, 4],
			[0, 1],
			[1, 10]
		];
	}));

//#endregion
//#region src/models/fsrs-4dot5/algorithm.ts
	function forgetting_curve$1(elapsed_days, stability) {
		return roundTo(Math.pow(1 + FSRS4Dot5_FACTOR * elapsed_days / stability, -FSRS4Dot5_DECAY), 8);
	}
	var FSRS4Dot5Algorithm;
	var init_algorithm$1 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_constants();
		init_defineProperty();
		FSRS4Dot5Algorithm = class {
			constructor(weights, bounds) {
				this.weights = weights;
				this.bounds = bounds;
				_defineProperty(this, "forgetting_curve", forgetting_curve$1);
				if (!Array.isArray(weights) || weights.length !== 17) throw new FSRSValidationError(`FSRS4Dot5Algorithm requires exactly 17 weights, but received ${weights === null || weights === void 0 ? void 0 : weights.length}`);
			}
			init_stability(g) {
				return Math.max(this.weights[g - 1], .1);
			}
			init_difficulty(g) {
				const w = this.weights;
				return clamp(roundTo(w[4] - (g - 3) * w[5], 8), this.bounds.dMin, this.bounds.dMax);
			}
			next_interval(s, desired_retention) {
				if (!Number.isFinite(desired_retention) || desired_retention <= 0 || desired_retention > 1) throw new FSRSValidationError("Desired retention rate should be in the range (0,1]");
				const intervalModifier = roundTo((Math.pow(desired_retention, 1 / -FSRS4Dot5_DECAY) - 1) / FSRS4Dot5_FACTOR, 8);
				return Math.max(Math.round(s * intervalModifier), 1);
			}
			next_difficulty(d, g) {
				const next_d = d - this.weights[6] * (g - 3);
				return clamp(this.mean_reversion(this.weights[4], next_d), this.bounds.dMin, this.bounds.dMax);
			}
			mean_reversion(init, current) {
				const w = this.weights;
				return roundTo(w[7] * init + (1 - w[7]) * current, 8);
			}
			next_recall_stability(d, s, r, g) {
				const w = this.weights;
				const hard_penalty = Rating.Hard === g ? w[15] : 1;
				const easy_bound = Rating.Easy === g ? w[16] : 1;
				return roundTo(clamp(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard_penalty * easy_bound), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_forget_stability(d, s, r) {
				const w = this.weights;
				const next_s = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
				return roundTo(clamp(Math.min(next_s, s), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_state(memory_state, t, g, r) {
				const { difficulty: d, stability: s } = memory_state !== null && memory_state !== void 0 ? memory_state : {
					difficulty: 0,
					stability: 0
				};
				if (t < 0) throw new FSRSValidationError(`Invalid delta_t "${t}"`);
				if (g < 0 || g > 4) throw new FSRSValidationError(`Invalid grade "${g}"`);
				if (g === Rating.Manual) return {
					difficulty: d,
					stability: s
				};
				const grade = g;
				if (d === 0 && s === 0) return {
					difficulty: this.init_difficulty(grade),
					stability: this.init_stability(grade)
				};
				if (d < this.bounds.dMin || s < this.bounds.sMin) throw new FSRSValidationError(`Invalid memory state { difficulty: ${d}, stability: ${s} }`);
				r = typeof r === "number" ? r : this.forgetting_curve(t, s);
				const new_s = g === Rating.Again ? this.next_forget_stability(d, s, r) : this.next_recall_stability(d, s, r, grade);
				return {
					difficulty: this.next_difficulty(d, grade),
					stability: new_s
				};
			}
		};
	}));

//#endregion
//#region src/models/fsrs-4dot5/parameters.ts
	var clipFSRS4Dot5Parameters, checkFSRS4Dot5Parameters, migrateFSRS4Dot5Parameters, fsrs4Dot5ConfigSchema;
	var init_parameters$1 = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_schema_utils();
		init_constants();
		clipFSRS4Dot5Parameters = (parameters) => {
			return FSRS4Dot5ParameterBounds().slice(0, parameters.length).map(([min, max], index) => clamp(parameters[index] || 0, min, max));
		};
		checkFSRS4Dot5Parameters = (parameters) => {
			const clipped = clipFSRS4Dot5Parameters(Array.from(parameters));
			if (!(parameters.length === FSRS4Dot5_DEFAULT_WEIGHTS.length && clipped.every((value, index) => value === parameters[index]))) throw new FSRSValidationError("Expected FSRS4.5 weights within model bounds.");
			return parameters;
		};
		migrateFSRS4Dot5Parameters = (parameters) => {
			if (!Array.isArray(parameters) || parameters.length === 0) return [...FSRS4Dot5_DEFAULT_WEIGHTS];
			return clipFSRS4Dot5Parameters(parameters);
		};
		fsrs4Dot5ConfigSchema = defineSchema((value) => {
			if (isObject$1(value) && isNumberArray(value.weights)) return { value: { weights: value.weights } };
			return { issues: [{ message: "Expected FSRS4.5 config" }] };
		});
	}));

//#endregion
//#region src/models/fsrs-4dot5/model.ts
	var createFSRS4Dot5Model, FSRS4Dot5Model;
	var init_model$1 = __esmMin((() => {
		init_esm();
		init_kit();
		init_algorithm$1();
		init_constants();
		init_parameters$1();
		createFSRS4Dot5Model = (config) => {
			const bounds = FSRS4Dot5_MODEL_BOUNDS;
			const algo = new FSRS4Dot5Algorithm(config.weights, FSRS4Dot5_MODEL_BOUNDS);
			const step = ({ memoryState, rating, elapsedDays, retrievability }) => {
				return algo.next_state(memoryState, elapsedDays, rating, retrievability);
			};
			const nextInterval = (memoryState, desiredRetention) => {
				return algo.next_interval(memoryState.stability, desiredRetention);
			};
			const forgettingCurve = (memoryState, elapsedDays) => {
				return algo.forgetting_curve(elapsedDays, memoryState.stability);
			};
			const forward = ({ history, initialState }) => {
				const states = [];
				let memoryState = initialState || null;
				for (const review of history) {
					memoryState = step({
						memoryState,
						rating: review.rating,
						elapsedDays: review.deltaT
					});
					states.push(memoryState);
				}
				return states;
			};
			return {
				config,
				bounds,
				algorithm: algo,
				step,
				nextInterval,
				forgettingCurve,
				forward
			};
		};
		FSRS4Dot5Model = defineModel({
			name: "fsrs-4dot5",
			schema: {
				config: fsrs4Dot5ConfigSchema,
				memoryState: FSRSMemoryStateSchema
			},
			defaultValue: { memoryState() {
				return {
					stability: 0,
					difficulty: 0
				};
			} },
			create({ config, migrate = true, check = true, bypass = false }) {
				if (bypass) return createFSRS4Dot5Model(config);
				const weights = migrate ? migrateFSRS4Dot5Parameters(config.weights) : config.weights;
				if (check) checkFSRS4Dot5Parameters(weights);
				const $config = fsrs4Dot5ConfigSchema.parse({ weights });
				return createFSRS4Dot5Model(Object.freeze($config));
			}
		});
	}));

//#endregion
//#region src/models/fsrs-4dot5/index.ts
	var fsrs_4dot5_exports = /* @__PURE__ */ __exportAll({
		FSRS4Dot5Algorithm: () => FSRS4Dot5Algorithm,
		FSRS4Dot5Model: () => FSRS4Dot5Model,
		FSRS4Dot5_DECAY: () => FSRS4Dot5_DECAY,
		FSRS4Dot5_DEFAULT_WEIGHTS: () => FSRS4Dot5_DEFAULT_WEIGHTS,
		FSRS4Dot5_FACTOR: () => FSRS4Dot5_FACTOR,
		FSRS4Dot5_MODEL_BOUNDS: () => FSRS4Dot5_MODEL_BOUNDS,
		checkFSRS4Dot5Parameters: () => checkFSRS4Dot5Parameters,
		clipFSRS4Dot5Parameters: () => clipFSRS4Dot5Parameters,
		forgettingCurve: () => forgetting_curve$1,
		fsrs4Dot5ConfigSchema: () => fsrs4Dot5ConfigSchema,
		migrateFSRS4Dot5Parameters: () => migrateFSRS4Dot5Parameters
	});
	var init_fsrs_4dot5 = __esmMin((() => {
		init_algorithm$1();
		init_constants();
		init_model$1();
		init_parameters$1();
	}));

//#endregion
//#region src/models/fsrs-5/algorithm.ts
	function forgetting_curve(elapsed_days, stability) {
		return roundTo(Math.pow(1 + FSRS5_FACTOR * elapsed_days / stability, -FSRS5_DECAY), 8);
	}
	var FSRS5Algorithm;
	var init_algorithm = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_constants$4();
		init_defineProperty();
		FSRS5Algorithm = class {
			constructor(weights, enableShortTerm, bounds) {
				this.weights = weights;
				this.enableShortTerm = enableShortTerm;
				this.bounds = bounds;
				_defineProperty(this, "forgetting_curve", forgetting_curve);
				if (!Array.isArray(weights) || weights.length !== 19) throw new FSRSValidationError(`FSRS5Algorithm requires exactly 19 weights, but received ${weights === null || weights === void 0 ? void 0 : weights.length}`);
			}
			init_stability(g) {
				return Math.max(this.weights[g - 1], .1);
			}
			init_difficulty(g) {
				const w = this.weights;
				return clamp(roundTo(w[4] - Math.exp((g - 1) * w[5]) + 1, 8), this.bounds.dMin, this.bounds.dMax);
			}
			next_interval(s, desired_retention) {
				if (!Number.isFinite(desired_retention) || desired_retention <= 0 || desired_retention > 1) throw new FSRSValidationError("Requested retention rate should be in the range (0,1]");
				const intervalModifier = roundTo((Math.pow(desired_retention, 1 / -FSRS5_DECAY) - 1) / FSRS5_FACTOR, 8);
				return Math.max(Math.round(s * intervalModifier), 1);
			}
			/**
			* @see https://github.com/open-spaced-repetition/fsrs4anki/issues/697
			*/
			linear_damping(delta_d, old_d) {
				return roundTo(delta_d * (10 - old_d) / 9, 8);
			}
			next_difficulty(d, g) {
				const delta_d = -this.weights[6] * (g - 3);
				const next_d = d + this.linear_damping(delta_d, d);
				return clamp(this.mean_reversion(this.init_difficulty(Rating.Easy), next_d), this.bounds.dMin, this.bounds.dMax);
			}
			mean_reversion(init, current) {
				const w = this.weights;
				return roundTo(w[7] * init + (1 - w[7]) * current, 8);
			}
			next_recall_stability(d, s, r, g) {
				const w = this.weights;
				const hard_penalty = Rating.Hard === g ? w[15] : 1;
				const easy_bound = Rating.Easy === g ? w[16] : 1;
				return roundTo(clamp(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard_penalty * easy_bound), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_forget_stability(d, s, r) {
				const w = this.weights;
				return roundTo(clamp(w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_short_term_stability(s, g) {
				const w = this.weights;
				return roundTo(clamp(s * Math.exp(w[17] * (g - 3 + w[18])), this.bounds.sMin, this.bounds.sMax), 8);
			}
			next_state(memory_state, t, g, r) {
				const { difficulty: d, stability: s } = memory_state !== null && memory_state !== void 0 ? memory_state : {
					difficulty: 0,
					stability: 0
				};
				if (t < 0) throw new FSRSValidationError(`Invalid delta_t "${t}"`);
				if (g < 0 || g > 4) throw new FSRSValidationError(`Invalid grade "${g}"`);
				if (g === Rating.Manual) return {
					difficulty: d,
					stability: s
				};
				const grade = g;
				if (d === 0 && s === 0) return {
					difficulty: this.init_difficulty(grade),
					stability: this.init_stability(grade)
				};
				if (d < this.bounds.dMin || s < this.bounds.sMin) throw new FSRSValidationError(`Invalid memory state { difficulty: ${d}, stability: ${s} }`);
				r = typeof r === "number" ? r : this.forgetting_curve(t, s);
				let new_s;
				if (t === 0 && this.enableShortTerm) new_s = this.next_short_term_stability(s, grade);
				else if (g === Rating.Again) {
					const s_after_fail = this.next_forget_stability(d, s, r);
					let [w_17, w_18] = [0, 0];
					if (this.enableShortTerm) {
						w_17 = this.weights[17];
						w_18 = this.weights[18];
					}
					new_s = clamp(roundTo(s / Math.exp(w_17 * w_18), 8), this.bounds.sMin, s_after_fail);
				} else new_s = this.next_recall_stability(d, s, r, grade);
				return {
					difficulty: this.next_difficulty(d, grade),
					stability: new_s
				};
			}
		};
	}));

//#endregion
//#region src/models/fsrs-5/parameters.ts
	var clipFSRS5Parameters, checkFSRS5Parameters, migrateFSRS5Parameters, fsrs5ConfigSchema;
	var init_parameters = __esmMin((() => {
		init_esm();
		init_error();
		init_help();
		init_schema_utils();
		init_constants$4();
		clipFSRS5Parameters = (parameters) => {
			return FSRS5ParameterBounds().slice(0, parameters.length).map(([min, max], index) => clamp(parameters[index] || 0, min, max));
		};
		checkFSRS5Parameters = (parameters) => {
			const clipped = clipFSRS5Parameters(Array.from(parameters));
			if (!(parameters.length === FSRS5_DEFAULT_WEIGHTS.length && clipped.every((value, index) => value === parameters[index]))) throw new FSRSValidationError("Expected FSRS5 weights within model bounds.");
			return parameters;
		};
		migrateFSRS5Parameters = (parameters) => {
			if (!Array.isArray(parameters) || parameters.length === 0) return [...FSRS5_DEFAULT_WEIGHTS];
			if (parameters.length > 19) return clipFSRS5Parameters(parameters);
			switch (parameters.length) {
				case 19: return clipFSRS5Parameters(parameters);
				case 17: {
					const weights = clipFSRS5Parameters(parameters);
					weights[4] = roundTo(weights[5] * 2 + weights[4], 8);
					weights[5] = roundTo(Math.log(weights[5] * 3 + 1) / 3, 8);
					weights[6] = roundTo(weights[6] + .5, 8);
					return clipFSRS5Parameters(weights.concat([0, 0]));
				}
				default: throw new FSRSValidationError(`Invalid parameters length "${parameters.length}", expected 17 or 19.`);
			}
		};
		fsrs5ConfigSchema = defineSchema((value) => {
			if (isObject$1(value) && isNumberArray(value.weights) && typeof value.enableShortTerm === "boolean") return { value: {
				weights: value.weights,
				enableShortTerm: value.enableShortTerm
			} };
			return { issues: [{ message: "Expected FSRS5 config" }] };
		});
	}));

//#endregion
//#region src/models/fsrs-5/model.ts
	var createFSRS5Model, FSRS5Model;
	var init_model = __esmMin((() => {
		init_esm();
		init_kit();
		init_algorithm();
		init_constants$4();
		init_parameters();
		createFSRS5Model = (config) => {
			const bounds = FSRS5_MODEL_BOUNDS;
			const algo = new FSRS5Algorithm(config.weights, config.enableShortTerm, FSRS5_MODEL_BOUNDS);
			const step = ({ memoryState, rating, elapsedDays, retrievability }) => {
				return algo.next_state(memoryState, elapsedDays, rating, retrievability);
			};
			const nextInterval = (memoryState, desiredRetention) => {
				return algo.next_interval(memoryState.stability, desiredRetention);
			};
			const forgettingCurve = (memoryState, elapsedDays) => {
				return algo.forgetting_curve(elapsedDays, memoryState.stability);
			};
			const forward = ({ history, initialState }) => {
				const states = [];
				let memoryState = initialState || null;
				for (const review of history) {
					memoryState = step({
						memoryState,
						rating: review.rating,
						elapsedDays: review.deltaT
					});
					states.push(memoryState);
				}
				return states;
			};
			return {
				config,
				bounds,
				algorithm: algo,
				step,
				nextInterval,
				forgettingCurve,
				forward
			};
		};
		FSRS5Model = defineModel({
			name: "fsrs-5",
			schema: {
				config: fsrs5ConfigSchema,
				memoryState: FSRSMemoryStateSchema
			},
			defaultValue: { memoryState() {
				return {
					stability: 0,
					difficulty: 0
				};
			} },
			create({ config, migrate = true, check = true, bypass = false }) {
				if (bypass) return createFSRS5Model(config);
				const weights = migrate ? migrateFSRS5Parameters(config.weights) : config.weights;
				if (check) checkFSRS5Parameters(weights);
				const $config = fsrs5ConfigSchema.parse({
					weights,
					enableShortTerm: config.enableShortTerm
				});
				return createFSRS5Model(Object.freeze($config));
			}
		});
	}));

//#endregion
//#region src/models/fsrs-5/index.ts
	var fsrs_5_exports = /* @__PURE__ */ __exportAll({
		FSRS5Algorithm: () => FSRS5Algorithm,
		FSRS5Model: () => FSRS5Model,
		FSRS5_DECAY: () => FSRS5_DECAY,
		FSRS5_DEFAULT_WEIGHTS: () => FSRS5_DEFAULT_WEIGHTS,
		FSRS5_FACTOR: () => FSRS5_FACTOR,
		FSRS5_MODEL_BOUNDS: () => FSRS5_MODEL_BOUNDS,
		FSRS5_W17_W18_CEILING: () => 2,
		checkFSRS5Parameters: () => checkFSRS5Parameters,
		clipFSRS5Parameters: () => clipFSRS5Parameters,
		forgettingCurve: () => forgetting_curve,
		fsrs5ConfigSchema: () => fsrs5ConfigSchema,
		migrateFSRS5Parameters: () => migrateFSRS5Parameters
	});
	var init_fsrs_5 = __esmMin((() => {
		init_algorithm();
		init_constants$4();
		init_model();
		init_parameters();
	}));

//#endregion
//#region src/scheduler/preset.ts
	init_esm();
	init_error();
	const defaultSchedulerMiddlewares = [
		schedulerDesiredRetentionMiddleware,
		schedulerFuzzingMiddleware,
		schedulerStatsMiddleware,
		schedulerScheduledDaysMiddleware,
		schedulerLearningStepsMiddleware,
		schedulerMaximumIntervalMiddleware,
		schedulerMonotonicIntervalMiddleware
	];
	function createRuntimeDefaultSchedulerDefinition(model) {
		return defineScheduler({
			model,
			chrono: dateChrono
		}).use(...defaultSchedulerMiddlewares);
	}
	const schedulerPresetLoaders = {
		"FSRS-3": async () => {
			const { FSRS3Model, migrateFSRS3Parameters } = await Promise.resolve().then(() => (init_fsrs_3(), fsrs_3_exports));
			return {
				model: FSRS3Model,
				migrateParameters: migrateFSRS3Parameters
			};
		},
		"FSRS-4": async () => {
			const { FSRS4Model, migrateFSRS4Parameters } = await Promise.resolve().then(() => (init_fsrs_4(), fsrs_4_exports));
			return {
				model: FSRS4Model,
				migrateParameters: migrateFSRS4Parameters
			};
		},
		"FSRS-4.5": async () => {
			const { FSRS4Dot5Model, migrateFSRS4Dot5Parameters } = await Promise.resolve().then(() => (init_fsrs_4dot5(), fsrs_4dot5_exports));
			return {
				model: FSRS4Dot5Model,
				migrateParameters: migrateFSRS4Dot5Parameters
			};
		},
		"FSRS-5": async () => {
			const { FSRS5Model, migrateFSRS5Parameters } = await Promise.resolve().then(() => (init_fsrs_5(), fsrs_5_exports));
			return {
				model: FSRS5Model,
				migrateParameters: migrateFSRS5Parameters
			};
		},
		"FSRS-6": async () => {
			const { FSRS6Model, migrateFSRS6Parameters } = await Promise.resolve().then(() => (init_fsrs_6(), fsrs_6_exports));
			return {
				model: FSRS6Model,
				migrateParameters: migrateFSRS6Parameters
			};
		}
	};
	const schedulerPresetCache = /* @__PURE__ */ new Map();
	async function getSchedulerPreset(version) {
		const resolvedVersion = version !== null && version !== void 0 ? version : "FSRS-6";
		if (!Object.hasOwn(schedulerPresetLoaders, resolvedVersion)) throw new FSRSValidationError(`Unsupported FSRS version "${version}"`);
		let preset = schedulerPresetCache.get(resolvedVersion);
		if (!preset) {
			preset = schedulerPresetLoaders[resolvedVersion]().then(({ model, migrateParameters }) => ({
				definition: createRuntimeDefaultSchedulerDefinition(model),
				migrateParameters
			}));
			schedulerPresetCache.set(resolvedVersion, preset);
		}
		return preset;
	}

//#endregion
//#region src/scheduler/default-scheduler.ts
	async function DefaultScheduler(options = {}) {
		const preset = await getSchedulerPreset(options.version);
		const { weights, enableShortTerm = true, desiredRetention = .9, learningSteps = defaultLearningSteps, relearningSteps = defaultRelearningSteps, enableFuzz = false, maximumInterval = DEFAULT_MAXIMUM_INTERVAL } = options;
		const migratedWeights = preset.migrateParameters(weights ? Array.from(weights) : void 0, relearningSteps.length, enableShortTerm);
		return preset.definition.create({ config: {
			weights: migratedWeights,
			enableShortTerm,
			numRelearningSteps: relearningSteps.length,
			desiredRetention,
			learningSteps: Array.from(learningSteps),
			relearningSteps: Array.from(relearningSteps),
			enableFuzz,
			maximumInterval,
			clearStatsOnForget: options.clearStatsOnForget
		} });
	}

//#endregion
//#region src/index.ts
	init_esm();
	init_help();
	init_schema();

//#endregion
exports.AbstractScheduler = AbstractScheduler;
exports.CLAMP_PARAMETERS = CLAMP_PARAMETERS;
exports.ConvertStepUnitToMinutes = ConvertStepUnitToMinutes;
exports.DEFAULT_LEECH_THRESHOLD = DEFAULT_LEECH_THRESHOLD;
exports.DEFAULT_MAXIMUM_INTERVAL = DEFAULT_MAXIMUM_INTERVAL;
exports.DefaultScheduler = DefaultScheduler;
exports.FSRS = FSRS;
exports.FSRS5_DEFAULT_DECAY = FSRS5_DECAY;
exports.FSRS6_DEFAULT_DECAY = FSRS6_DECAY;
exports.FSRSMemoryStateSchema = FSRSMemoryStateSchema;
exports.FSRSVersion = FSRSVersion;
exports.FUZZ_RANGES = FUZZ_RANGES;
exports.Grades = Grades;
exports.INIT_S_MAX = INIT_S_MAX;
exports.Rating = Rating;
exports.S_MAX = S_MAX;
exports.S_MIN = S_MIN;
exports.State = State;
exports.StrategyMode = StrategyMode;
exports.TypeConvert = TypeConvert;
exports.W17_W18_Ceiling = W17_W18_Ceiling;
exports.calculateLearningSteps = calculateLearningSteps;
exports.calculateScheduleDay = calculateScheduleDay;
exports.calculateScheduleDays = calculateScheduleDays;
exports.checkParameters = checkParameters;
exports.clamp = clamp;
exports.createEmptyCard = createEmptyCard;
exports.createSchedulerFuzzingMiddleware = createSchedulerFuzzingMiddleware;
exports.dateChrono = dateChrono;
exports.dateDiffInDays = dateDiffInDays;
exports.date_diff = date_diff;
exports.date_scheduler = date_scheduler;
exports.defaultLearningSteps = defaultLearningSteps;
exports.defaultRelearningSteps = defaultRelearningSteps;
exports.default_enable_fuzz = default_enable_fuzz;
exports.default_enable_short_term = default_enable_short_term;
exports.default_maximum_interval = default_maximum_interval;
exports.default_request_retention = default_request_retention;
exports.default_w = default_w;
exports.defineChrono = defineChrono;
exports.defineMiddleware = defineMiddleware;
exports.defineScheduler = defineScheduler;
exports.desiredRetentionConfigSchema = desiredRetentionConfigSchema;
exports.fnv1aMulberry32Rng = fnv1aMulberry32Rng;
exports.formatDate = formatDate;
exports.fsrs = fsrs;
exports.fuzzingCardFieldsSchema = fuzzingCardFieldsSchema;
exports.fuzzingCardInitInputSchema = fuzzingCardInitInputSchema;
exports.fuzzingConfigSchema = fuzzingConfigSchema;
exports.fuzzingRevlogFieldsSchema = fuzzingRevlogFieldsSchema;
exports.generatorParameters = generatorParameters;
exports.getFuzzRange = getFuzzRange;
exports.get_fuzz_range = get_fuzz_range;
exports.gradeSchema = gradeSchema;
exports.learningStepFieldsSchema = learningStepFieldsSchema;
exports.learningStepsConfigSchema = learningStepsConfigSchema;
exports.leechCardFieldsSchema = leechCardFieldsSchema;
exports.leechConfigSchema = leechConfigSchema;
exports.monotonicIntervalConfigSchema = monotonicIntervalConfigSchema;
exports.numericChrono = numericChrono;
exports.ratingSchema = ratingSchema;
exports.roundTo = roundTo;
exports.scheduledDaysFieldsSchema = scheduledDaysFieldsSchema;
exports.schedulerDesiredRetentionMiddleware = schedulerDesiredRetentionMiddleware;
exports.schedulerFuzzingMiddleware = schedulerFuzzingMiddleware;
exports.schedulerLearningStepsMiddleware = schedulerLearningStepsMiddleware;
exports.schedulerLeechMiddleware = schedulerLeechMiddleware;
exports.schedulerMaximumIntervalMiddleware = schedulerMaximumIntervalMiddleware;
exports.schedulerMonotonicIntervalMiddleware = schedulerMonotonicIntervalMiddleware;
exports.schedulerScheduledDaysMiddleware = schedulerScheduledDaysMiddleware;
exports.schedulerStatsMiddleware = schedulerStatsMiddleware;
exports.show_diff_message = show_diff_message;
exports.stateSchema = stateSchema;
exports.statsConfigSchema = statsConfigSchema;
exports.statsFieldsSchema = statsFieldsSchema;
exports.temporalInstantChrono = temporalInstantChrono;
exports.withFuzzing = withFuzzing;
});