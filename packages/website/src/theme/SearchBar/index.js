/* eslint-disable import/no-unresolved */

import { DocSearchButton, useDocSearchKeyboardEvents } from '@docsearch/react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import('@docsearch/react/style/variables');
import('@docsearch/react/style/button');

let DocSearchModal = null;

function Hit({ hit, children }) {
  return <Link to={hit.url}>{children}</Link>;
}

function ResultsFooter({ state }) {
  return (
    <Link to={`/search?q=${state.query}`}>
      See {state.context.nbHits} results
    </Link>
  );
}

function transformItems(items) {
  return items.map((item) => {
    // We transform the absolute URL into a relative URL.
    // Alternatively, we can use `new URL(item.url)` but it's not
    // supported in IE.
    const a = document.createElement('a');
    a.href = item.url;

    return {
      ...item,
      url: `${a.pathname}${a.hash}`,
    };
  });
}

function DocSearch(props) {
  const history = useHistory();
  const searchButtonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState(null);

  const importDocSearchModalIfNeeded = useCallback(() => {
    if (DocSearchModal) {
      return Promise.resolve();
    }

    return Promise.all([
      import('@docsearch/react/modal'),
      import('@docsearch/react/style/modal'),
    ]).then(([{ DocSearchModal: Modal }]) => {
      DocSearchModal = Modal;
    });
  }, []);

  const onOpen = useCallback(() => {
    importDocSearchModalIfNeeded().then(() => {
      setIsOpen(true);
    });
  }, [importDocSearchModalIfNeeded, setIsOpen]);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const onInput = useCallback(
    (event) => {
      setIsOpen(true);
      setInitialQuery(event.key);
    },
    [setIsOpen, setInitialQuery]
  );

  useDocSearchKeyboardEvents({
    isOpen,
    onOpen,
    onClose,
    onInput,
    searchButtonRef,
  });

  return (
    <>
      <Head>
        {/* This hints the browser that the website will load data from Algolia,
        and allows it to preconnect to the DocSearch cluster. It makes the first
        query faster, especially on mobile. */}
        <link
          rel="preconnect"
          href={`https://${props.appId}-dsn.algolia.net`}
          crossOrigin
        />
      </Head>

      <DocSearchButton
        onTouchStart={importDocSearchModalIfNeeded}
        onFocus={importDocSearchModalIfNeeded}
        onMouseOver={importDocSearchModalIfNeeded}
        onClick={onOpen}
        ref={searchButtonRef}
      />

      {isOpen &&
        createPortal(
          <DocSearchModal
            initialScrollY={window.scrollY}
            initialQuery={initialQuery}
            onClose={onClose}
            navigator={{
              navigate({ suggestionUrl }) {
                history.push(suggestionUrl);
              },
            }}
            transformItems={transformItems}
            hitComponent={Hit}
            resultsFooterComponent={ResultsFooter}
            {...props}
          />,
          document.body
        )}
    </>
  );
}

function SearchBar() {
  const { siteConfig = {} } = useDocusaurusContext();

  if (!siteConfig.themeConfig.algolia) {
    // eslint-disable-next-line no-console
    console.warn(`DocSearch requires an \`algolia\` field in your \`themeConfig\`.

See: https://v2.docusaurus.io/docs/search/#using-algolia-docsearch`);

    return null;
  }

  return <DocSearch {...siteConfig.themeConfig.algolia} />;
}

export default SearchBar;
