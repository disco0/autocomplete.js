import {
  AutocompleteStore,
  AutocompleteSetters,
  RequiredAutocompleteOptions,
} from './types';

let lastStalledId: number | null = null;

interface OnInputOptions<TItem> extends AutocompleteSetters<TItem> {
  query: string;
  store: AutocompleteStore<TItem>;
  props: RequiredAutocompleteOptions<TItem>;
}

export function onInput<TItem>({
  query,
  store,
  props,
  setHighlightedIndex,
  setQuery,
  setSuggestions,
  setIsOpen,
  setStatus,
  setContext,
}: OnInputOptions<TItem>): void {
  if (lastStalledId) {
    clearTimeout(lastStalledId);
  }

  if (query.length < props.minLength) {
    setStatus('idle');
    return;
  }

  setHighlightedIndex(0);
  setStatus('loading');
  setQuery(query);

  lastStalledId = props.environment.setTimeout(() => {
    setStatus('stalled');
  }, props.stallThreshold);

  props
    .getSources({
      query,
      state: store.getState(),
      setHighlightedIndex,
      setQuery,
      setSuggestions,
      setIsOpen,
      setStatus,
      setContext,
    })
    .then(sources => {
      setStatus('loading');

      // @TODO: convert `Promise.all` to fetching strategy.
      return Promise.all(
        sources.map(source => {
          return Promise.resolve(
            source.getSuggestions({
              query,
              state: store.getState(),
              setHighlightedIndex,
              setQuery,
              setSuggestions,
              setIsOpen,
              setStatus,
              setContext,
            })
          ).then(items => {
            return {
              source,
              items,
            };
          });
        })
      )
        .then(suggestions => {
          setStatus('idle');
          setSuggestions(suggestions);
          setIsOpen(
            query.length >= props.minLength &&
              props.shouldDropdownOpen({ state: store.getState() })
          );
        })
        .catch(error => {
          setStatus('error');

          throw error;
        })
        .finally(() => {
          if (lastStalledId) {
            clearTimeout(lastStalledId);
          }
        });
    });
}