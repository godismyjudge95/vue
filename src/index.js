export function createLivewireApp(createMyApp) {
	const app = createMyApp();
	setupLivewireMixin(app);

	if (typeof window.livewire === 'undefined') {
		throw 'Livewire Vue Plugin: window.livewire is undefined. Make sure @livewireScripts is placed above this script include';
	}
	
	window.livewire.hook('message.received', (message, component) => {
		if (! message.response.effects.html) {
			return;
		}
	
		const div = document.createElement('div');
		div.innerHTML =  message.response.effects.html;
	
		const newApp = createMyApp();
		setupLivewireMixin(newApp);

		newApp.mount(div.firstElementChild);
		message.response.effects.html = div.firstElementChild;
	});
	
	window.livewire.hook('element.initialized', el => {
		if (el.__vue__) {
			el.__livewire_ignore = true;
		}
	});
	
	window.livewire.hook('interceptWireModelSetValue', (value, el) => {
		// If it's a vue component pass down the value prop.
		if (! el.__vue__ || el.value == value) {
			return;
		}
	
		el.__vue__._.props.modelValue = value;
		console.log(['Livewire updating modelValue', value, el]);
	});
	
	window.livewire.hook('interceptWireModelAttachListener', (directive, el, component, debounceIf) => {
		// If it's a vue component pass down the value prop.
		if (! el.__vue__) {
			return;
		}
	
		const hasDebounceModifier = directive.modifiers.includes('debounce');
		const isLazy = directive.modifiers.includes('lazy');
	
		if (debounceIf == undefined) {
			debounceIf = (condition, callback, time) => {
				return condition
						? component.modelSyncDebounce(callback, time)
						: callback
			}
		}
	
		el.addEventListener('livewire:update:modelValue', debounceIf(hasDebounceModifier || ! isLazy, e => {
			const model = directive.value;
			const value = e.detail;
	
			component.set(model, value);
		}, directive.durationOr(150)));
	});

	return app;
}

function setupLivewireMixin(initApp) {
	initApp.mixin({
		beforeCreate() {
			if (this._.vnode.props) {
				this._.vnode.props['onUpdate:modelValue'] = (value) => {
					this._.vnode.el.dispatchEvent(new CustomEvent('livewire:update:modelValue', {
						detail: value,
					}));
				}
			}
		},
		mounted() {
			if (this._.parent) {
				this.$el.__vue__ = this;
			}
		},
	});
}

export default {
	createLivewireApp
}