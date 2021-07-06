
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.38.2 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (172:0) {#if err}
    function create_if_block_2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "ialert ierror svelte-1w6258q");
    			add_location(div, file, 172, 1, 4582);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*err*/ ctx[3];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*err*/ 8) div.innerHTML = /*err*/ ctx[3];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(172:0) {#if err}",
    		ctx
    	});

    	return block;
    }

    // (177:0) {#if success}
    function create_if_block_1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*success*/ ctx[1]);
    			attr_dev(div, "class", "ialert isuccess svelte-1w6258q");
    			add_location(div, file, 177, 1, 4653);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*success*/ 2) set_data_dev(t, /*success*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(177:0) {#if success}",
    		ctx
    	});

    	return block;
    }

    // (182:0) {#if !eonzaHost}
    function create_if_block(ctx) {
    	let div;
    	let t_value = /*lng*/ ctx[2].nourl + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "ialert iinfo svelte-1w6258q");
    			add_location(div, file, 182, 1, 4727);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lng*/ 4 && t_value !== (t_value = /*lng*/ ctx[2].nourl + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(182:0) {#if !eonzaHost}",
    		ctx
    	});

    	return block;
    }

    // (186:1) {#each list as script}
    function create_each_block(ctx) {
    	let li;
    	let div0;
    	let t0_value = /*script*/ ctx[10].title + "";
    	let t0;
    	let br;
    	let t1;
    	let small;
    	let i;
    	let t2_value = /*script*/ ctx[10].name + "";
    	let t2;
    	let div0_title_value;
    	let t3;
    	let div1;
    	let img;
    	let img_src_value;
    	let div1_title_value;
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			div0 = element("div");
    			t0 = text(t0_value);
    			br = element("br");
    			t1 = space();
    			small = element("small");
    			i = element("i");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			img = element("img");
    			t4 = space();
    			add_location(br, file, 192, 18, 4981);
    			add_location(i, file, 193, 11, 4999);
    			attr_dev(small, "class", "svelte-1w6258q");
    			add_location(small, file, 193, 4, 4992);
    			attr_dev(div0, "class", "run rleft svelte-1w6258q");
    			attr_dev(div0, "title", div0_title_value = /*lng*/ ctx[2].run);
    			add_location(div0, file, 187, 3, 4867);
    			if (img.src !== (img_src_value = "images/right.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Options");
    			set_style(img, "width", "16px");
    			set_style(img, "height", "24px");
    			add_location(img, file, 201, 4, 5204);
    			attr_dev(div1, "class", "run svelte-1w6258q");
    			attr_dev(div1, "title", div1_title_value = /*lng*/ ctx[2].runsilently);
    			set_style(div1, "display", "flex");
    			set_style(div1, "align-items", "center");
    			set_style(div1, "flex", "0 0 32px");
    			add_location(div1, file, 195, 3, 5041);
    			set_style(li, "display", "flex");
    			set_style(li, "justify-content", "space-between");
    			add_location(li, file, 186, 2, 4808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div0);
    			append_dev(div0, t0);
    			append_dev(div0, br);
    			append_dev(div0, t1);
    			append_dev(div0, small);
    			append_dev(small, i);
    			append_dev(i, t2);
    			append_dev(li, t3);
    			append_dev(li, div1);
    			append_dev(div1, img);
    			append_dev(li, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div0,
    						"click",
    						function () {
    							if (is_function(/*runScript*/ ctx[5](/*script*/ ctx[10].name, true))) /*runScript*/ ctx[5](/*script*/ ctx[10].name, true).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div1,
    						"click",
    						function () {
    							if (is_function(/*runScript*/ ctx[5](/*script*/ ctx[10].name, false))) /*runScript*/ ctx[5](/*script*/ ctx[10].name, false).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*list*/ 16 && t0_value !== (t0_value = /*script*/ ctx[10].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*list*/ 16 && t2_value !== (t2_value = /*script*/ ctx[10].name + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*lng*/ 4 && div0_title_value !== (div0_title_value = /*lng*/ ctx[2].run)) {
    				attr_dev(div0, "title", div0_title_value);
    			}

    			if (dirty & /*lng*/ 4 && div1_title_value !== (div1_title_value = /*lng*/ ctx[2].runsilently)) {
    				attr_dev(div1, "title", div1_title_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(186:1) {#each list as script}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let ul;
    	let t3;
    	let div1;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let img0_alt_value;
    	let t4_value = /*lng*/ ctx[2].settings + "";
    	let t4;
    	let t5;
    	let a;
    	let img1;
    	let img1_src_value;
    	let img1_alt_value;
    	let t6_value = /*lng*/ ctx[2].help + "";
    	let t6;
    	let a_href_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*err*/ ctx[3] && create_if_block_2(ctx);
    	let if_block1 = /*success*/ ctx[1] && create_if_block_1(ctx);
    	let if_block2 = !/*eonzaHost*/ ctx[0] && create_if_block(ctx);
    	let each_value = /*list*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t4 = text(t4_value);
    			t5 = space();
    			a = element("a");
    			img1 = element("img");
    			t6 = text(t6_value);
    			add_location(ul, file, 184, 0, 4777);
    			if (img0.src !== (img0_src_value = "images/settings.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", img0_alt_value = /*lng*/ ctx[2].settings);
    			set_style(img0, "height", "1.5rem");
    			set_style(img0, "margin-right", "0.5rem");
    			attr_dev(img0, "class", "svelte-1w6258q");
    			add_location(img0, file, 213, 2, 5399);
    			attr_dev(div0, "class", "menu svelte-1w6258q");
    			add_location(div0, file, 212, 1, 5355);
    			if (img1.src !== (img1_src_value = "images/question-circle.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", img1_alt_value = /*lng*/ ctx[2].help);
    			set_style(img1, "height", "1.5rem");
    			set_style(img1, "margin-right", "0.5rem");
    			attr_dev(img1, "class", "svelte-1w6258q");
    			add_location(img1, file, 220, 2, 5585);
    			attr_dev(a, "class", "menu svelte-1w6258q");
    			attr_dev(a, "href", a_href_value = /*lng*/ ctx[2].helplink);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file, 219, 1, 5530);
    			attr_dev(div1, "class", "elist svelte-1w6258q");
    			add_location(div1, file, 211, 0, 5334);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t4);
    			append_dev(div1, t5);
    			append_dev(div1, a);
    			append_dev(a, img1);
    			append_dev(a, t6);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", openOptions, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*err*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*success*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!/*eonzaHost*/ ctx[0]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*lng, runScript, list*/ 52) {
    				each_value = /*list*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*lng*/ 4 && img0_alt_value !== (img0_alt_value = /*lng*/ ctx[2].settings)) {
    				attr_dev(img0, "alt", img0_alt_value);
    			}

    			if (dirty & /*lng*/ 4 && t4_value !== (t4_value = /*lng*/ ctx[2].settings + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*lng*/ 4 && img1_alt_value !== (img1_alt_value = /*lng*/ ctx[2].help)) {
    				attr_dev(img1, "alt", img1_alt_value);
    			}

    			if (dirty & /*lng*/ 4 && t6_value !== (t6_value = /*lng*/ ctx[2].help + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*lng*/ 4 && a_href_value !== (a_href_value = /*lng*/ ctx[2].helplink)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getSource() {
    	var s = document.documentElement.outerHTML;

    	//		chrome.runtime.sendMessage({ action: "getSource", source: s });
    	return s;
    }

    function openOptions() {
    	chrome.runtime.openOptionsPage();
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let eonzaHost = "";
    	let success = "";
    	let tabUrl = "";
    	let lang = "en";

    	let langres = {
    		en: {
    			errext: `Eonza is not available at <b>eonzaHost</b>. Try to <b><a href='eonzaHost'
				style='color:#fff;text-decoration:underline;' target='_blank'>open</a></b> it in the browser.`,
    			help: "Help",
    			helplink: "https://www.eonza.org/",
    			nourl: "Specify Eonza URL in Settings",
    			run: "Run and open the script in the browser",
    			runok: "Script is successfully run",
    			runsilently: "Run silently",
    			save: "Save",
    			settings: "Settings"
    		},
    		ru: {
    			errext: `Eonza не доступна по адресу <b>eonzaHost</b>. Попробуйте <b><a href='eonzaHost'
				style='color:#fff;text-decoration:underline;' target='_blank'>открыть</a></b> её в браузере.`,
    			help: "Помощь",
    			helplink: "https://www.eonza.org/ru/",
    			nourl: "Укажите Eonza URL в Настройках",
    			run: "Запустить и открыть скрипт в браузере",
    			runok: "Скрипт успешно запущен",
    			runsilently: "Запустить скрытно",
    			save: "Сохранить",
    			settings: "Настройки"
    		}
    	};

    	let lng = langres.en;
    	let err = "";
    	let list = [];

    	document.addEventListener("DOMContentLoaded", async function () {
    		lang = (navigator.language || navigator.userLanguage).substr(0, 2);

    		if (lang == "ru") {
    			$$invalidate(2, lng = langres[lang]);
    		}

    		let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    		/*chrome.scripting.executeScript(
    	{
    		target: { tabId: tab.id },
    		function: getSource,
    	},
    	(e) => {
    		console.log("ret", e[0].result);
    	}
    );*/
    		tabUrl = tab.url;

    		chrome.storage.sync.get({ eonzahost: "" }, function (items) {
    			$$invalidate(0, eonzaHost = items.eonzahost);

    			if (!!eonzaHost) {
    				if (eonzaHost.charAt(eonzaHost.length - 1) == "/") {
    					$$invalidate(0, eonzaHost = eonzaHost.substr(0, eonzaHost.length - 1));
    				}

    				getScripts();
    			}
    		});
    	});

    	async function getScripts() {
    		try {
    			const response = await fetch(`${eonzaHost}/api/browserext`, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" }, // 'Content-Type': 'application/x-www-form-urlencoded',
    				body: JSON.stringify({ url: tabUrl })
    			});

    			let data = await response.json();
    			$$invalidate(4, list = data.list);
    		} catch(error) {
    			$$invalidate(3, err = lng.errext.replaceAll("eonzaHost", encodeURI(eonzaHost)));
    		}
    	}

    	async function runScript(script, open) {
    		$$invalidate(3, err = "");

    		try {
    			const response = await fetch(`${eonzaHost}/api/browserrun`, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify({ name: script, open, url: tabUrl })
    			});

    			let data = await response.json();

    			if (!!data.error) {
    				$$invalidate(3, err = data.error);
    			} else {
    				$$invalidate(1, success = lng.runok);
    				setTimeout(() => $$invalidate(1, success = ""), 1000);

    				if (!eonzaHost.startsWith(`http://localhost`) && open) {
    					setTimeout(
    						() => {
    							let url = new URL(eonzaHost);
    							url.port = data.port;
    							window.open(url.toString(), "_blank");
    						},
    						1500
    					);
    				}
    			}
    		} catch(error) {
    			$$invalidate(3, err = error);
    		}
    	} /*
                    async function hostrun(root, id, port) {
                      let task
                      for (let i = 0; i < 8; i++) {
                        task = root.getTask(id)
                        if (task) {
                          break
                        }
                        await sleep(200)
                      }
                      if (!task) {
                        comp.connect()
                        task = {port: port}
                      }
                      window.open(window.location.protocol + '//' + window.location.hostname + ':' + task.port,
                        '_blank');
    			if (task.status < stFinished ) {
            window.open(window.location.protocol + '//' + window.location.hostname + ':' + task.port, '_blank');
          } else {
            window.open('/task/'+task.id, '_blank');
          }
                    };
                    hostrun(this, response.data.id, response.data.port);
                  }
                [[end]]
            })
            .catch(error => this.$root.errmsg(error));
    */

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		eonzaHost,
    		success,
    		tabUrl,
    		lang,
    		langres,
    		lng,
    		err,
    		list,
    		getSource,
    		getScripts,
    		runScript,
    		openOptions
    	});

    	$$self.$inject_state = $$props => {
    		if ("eonzaHost" in $$props) $$invalidate(0, eonzaHost = $$props.eonzaHost);
    		if ("success" in $$props) $$invalidate(1, success = $$props.success);
    		if ("tabUrl" in $$props) tabUrl = $$props.tabUrl;
    		if ("lang" in $$props) lang = $$props.lang;
    		if ("langres" in $$props) langres = $$props.langres;
    		if ("lng" in $$props) $$invalidate(2, lng = $$props.lng);
    		if ("err" in $$props) $$invalidate(3, err = $$props.err);
    		if ("list" in $$props) $$invalidate(4, list = $$props.list);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [eonzaHost, success, lng, err, list, runScript];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.getElementById("app"),
    });

    return app;

}());
