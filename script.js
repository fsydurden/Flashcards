document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const appContainer = document.querySelector('.app-container');
    const addCardForm = document.getElementById('add-card-form');
    const addCardBtn = document.getElementById('add-card-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const searchBar = document.getElementById('search-bar');
    const sortSelect = document.getElementById('sort-select');
    const tagsFilterContainer = document.getElementById('tags-filter-container');
    const bookCollectionContainer = document.getElementById('book-collection-container');
    const collectionView = document.getElementById('collection-view');
    const notesView = document.getElementById('notes-view');
    const notesViewTitle = document.getElementById('notes-view-title');
    const flashcardContainer = document.getElementById('flashcard-container');
    const backToCollectionBtn = document.getElementById('back-to-collection-btn');
    const reviewModal = document.getElementById('review-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const reviewCardContainer = document.getElementById('review-card-container');
    const reviewProgress = document.getElementById('review-progress');
    const prevCardBtn = document.getElementById('prev-card-btn');
    const nextCardBtn = document.getElementById('next-card-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

    // --- Data & State ---
    let flashcards = JSON.parse(localStorage.getItem('bookNotesFlashcards')) || [];
    let reviewState = { cards: [], currentIndex: 0 };
    let activeFilters = { search: '', tags: new Set() };

    // --- Main Functions ---
    const saveFlashcards = () => localStorage.setItem('bookNotesFlashcards', JSON.stringify(flashcards));
    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str || ''));
        return p.innerHTML;
    };
    const render = () => {
        displayBooks();
        displayTagFilters();
    };

    // --- Theme Management ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    };
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });

    // --- Display & View Management ---
    const showCollectionView = () => {
        collectionView.classList.remove('hidden');
        notesView.classList.add('hidden');
        render();
    };
    const showNotesView = (bookTitle) => {
        collectionView.classList.add('hidden');
        notesView.classList.remove('hidden');
        notesViewTitle.textContent = `Notes for "${escapeHTML(bookTitle)}"`;
        displayFlashcards(flashcards.filter(card => card.book === bookTitle));
    };

    const displayBooks = () => {
        bookCollectionContainer.innerHTML = '';
        const filteredCards = getFilteredCards();
        const books = groupFlashcardsByBook(filteredCards);
        const sortedBooks = sortBooks(Object.entries(books));

        if (sortedBooks.length === 0) {
            bookCollectionContainer.innerHTML = '<p>No books match your filters. Try adding a note!</p>';
            return;
        }

        sortedBooks.forEach(([title, bookData]) => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.innerHTML = `
                <div class="book-item-cover">
                    ${bookData.coverUrl ? `<img src="${bookData.coverUrl}" alt="Cover of ${escapeHTML(title)}">` : `<span>${escapeHTML(title)}</span>`}
                </div>
                <div class="book-item-info">
                    <h3>${escapeHTML(title)}</h3>
                    <p>${bookData.cardCount} note(s)</p>
                    <div class="book-actions">
                        <button class="btn btn-secondary view-notes-btn" data-title="${escapeHTML(title)}">View Notes</button>
                        <button class="btn btn-action start-review-btn" data-title="${escapeHTML(title)}">Start Review</button>
                    </div>
                </div>`;
            bookCollectionContainer.appendChild(bookItem);
        });
    };
    
    const displayTagFilters = () => {
        const allTags = new Set(flashcards.flatMap(card => card.tags || []));
        tagsFilterContainer.innerHTML = '';
        if (allTags.size > 0) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'tag-filter-btn';
            clearBtn.textContent = 'All';
            clearBtn.onclick = () => {
                activeFilters.tags.clear();
                render();
            };
            if (activeFilters.tags.size === 0) clearBtn.classList.add('active');
            tagsFilterContainer.appendChild(clearBtn);
        }
        allTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'tag-filter-btn';
            tagBtn.textContent = tag;
            tagBtn.dataset.tag = tag;
            if (activeFilters.tags.has(tag)) tagBtn.classList.add('active');
            tagBtn.onclick = () => {
                if (activeFilters.tags.has(tag)) {
                    activeFilters.tags.delete(tag);
                } else {
                    activeFilters.tags.add(tag);
                }
                render();
            };
            tagsFilterContainer.appendChild(tagBtn);
        });
    };

    const displayFlashcards = (cards) => {
        flashcardContainer.innerHTML = '';
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'flashcard';
            cardElement.innerHTML = `
                ${card.difficulty && card.difficulty !== 'new' ? `<span class="card-difficulty ${card.difficulty}">${card.difficulty}</span>` : ''}
                <div class="card-inner">
                    <div class="card-front">
                        <div class="card-content">${escapeHTML(card.front)}</div>
                        ${card.page ? `<div class="card-page-number">p. ${escapeHTML(card.page)}</div>` : ''}
                    </div>
                    <div class="card-back">
                        <div class="card-content">${escapeHTML(card.back)}</div>
                    </div>
                </div>
                <button class="delete-btn" title="Delete card">X</button>`;
            cardElement.addEventListener('click', (e) => !e.target.classList.contains('delete-btn') && e.currentTarget.classList.toggle('flipped'));
            cardElement.querySelector('.delete-btn').addEventListener('click', () => deleteCard(card.id, card.book));
            flashcardContainer.appendChild(cardElement);
        });
    };

    // --- Filtering, Sorting, Grouping ---
    const getFilteredCards = () => {
        return flashcards.filter(card => {
            const searchMatch = !activeFilters.search || card.book.toLowerCase().includes(activeFilters.search);
            const tagMatch = activeFilters.tags.size === 0 || (card.tags && card.tags.some(tag => activeFilters.tags.has(tag)));
            return searchMatch && tagMatch;
        });
    };
    const groupFlashcardsByBook = (cards) => cards.reduce((acc, card) => {
        if (!acc[card.book]) {
            acc[card.book] = { cardCount: 0, coverUrl: card.coverUrl, cards: [] };
        }
        acc[card.book].cardCount++;
        acc[card.book].cards.push(card);
        return acc;
    }, {});
    const sortBooks = (books) => {
        const sortMethod = sortSelect.value;
        return books.sort(([, a], [, b]) => {
            // Get the timestamp of the newest card in each book for date sorting
            const dateA = Math.max(...a.cards.map(c => c.id));
            const dateB = Math.max(...b.cards.map(c => c.id));
            switch(sortMethod) {
                case 'date-asc': return dateA - dateB;
                case 'title-asc': return a.cards[0].book.localeCompare(b.cards[0].book);
                case 'title-desc': return b.cards[0].book.localeCompare(a.cards[0].book);
                case 'date-desc':
                default:
                    return dateB - dateA;
            }
        });
    };

    // --- Data Handling (Add, Delete, CRUD) ---
    const addCard = async (e) => {
        e.preventDefault();
        const book = document.getElementById('book-title').value.trim();
        const front = document.getElementById('card-front').value.trim();
        const back = document.getElementById('card-back').value.trim();
        const page = document.getElementById('card-page').value.trim();
        const tags = document.getElementById('card-tags').value.trim().split(',').map(t => t.trim()).filter(Boolean);
        if (!book || !front || !back) { alert('Book, Front, and Back fields are required.'); return; }

        addCardBtn.disabled = true; addCardBtn.textContent = 'Saving...';
        try {
            const coverUrl = flashcards.find(c => c.book === book)?.coverUrl || await getBookCover(book);
            const newCard = { id: Date.now(), book, front, back, page, tags, coverUrl, difficulty: 'new' };
            flashcards.unshift(newCard);
            saveFlashcards();
            render();
            addCardForm.reset();
        } finally {
            addCardBtn.disabled = false; addCardBtn.textContent = 'Save Flashcard';
        }
    };
    const deleteCard = (cardId, bookTitle) => {
        if (confirm('Delete this card forever?')) {
            flashcards = flashcards.filter(card => card.id !== cardId);
            saveFlashcards();
            if (!notesView.classList.contains('hidden')) {
                showNotesView(bookTitle); // Refresh notes view
            }
            render(); // Refresh collection view counts
        }
    };

    // --- Review Modal ---
    const startReview = (bookTitle) => {
        reviewState.cards = flashcards.filter(card => card.book === bookTitle);
        if (reviewState.cards.length === 0) return;
        reviewState.currentIndex = 0;
        reviewModal.classList.remove('hidden');
        displayReviewCard();
    };
    const displayReviewCard = () => {
        const card = reviewState.cards[reviewState.currentIndex];
        reviewCardContainer.innerHTML = `<div class="flashcard" id="review-card">
            <div class="card-inner">
                <div class="card-front"><div class="card-content">${escapeHTML(card.front)}</div></div>
                <div class="card-back"><div class="card-content">${escapeHTML(card.back)}</div></div>
            </div></div>`;
        reviewCardContainer.querySelector('.flashcard').addEventListener('click', e => e.currentTarget.classList.toggle('flipped'));
        reviewProgress.textContent = `Card ${reviewState.currentIndex + 1} of ${reviewState.cards.length}`;
        prevCardBtn.disabled = reviewState.currentIndex === 0;
        nextCardBtn.disabled = reviewState.currentIndex === reviewState.cards.length - 1;
    };
    const setCardDifficulty = (difficulty) => {
        const cardId = reviewState.cards[reviewState.currentIndex].id;
        const cardInMainArray = flashcards.find(c => c.id === cardId);
        if(cardInMainArray) {
            cardInMainArray.difficulty = difficulty;
            saveFlashcards();
        }
    };

    // --- API & Data IO ---
    const getBookCover = async (title) => {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const bookWithCover = data.docs.find(doc => doc.cover_i);
            return bookWithCover ? `https://covers.openlibrary.org/b/id/${bookWithCover.cover_i}-M.jpg` : null;
        } catch { return null; }
    };
    const exportData = () => {
        const dataStr = JSON.stringify(flashcards, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `book-notes-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData) && confirm(`This will replace your current collection with ${importedData.length} new cards. Are you sure?`)) {
                    flashcards = importedData;
                    saveFlashcards();
                    showCollectionView();
                } else { alert('Invalid file format.'); }
            } catch { alert('Could not read the file.'); }
        };
        reader.readAsText(file);
    };

    // --- Event Listeners ---
    addCardForm.addEventListener('submit', addCard);
    backToCollectionBtn.addEventListener('click', showCollectionView);
    bookCollectionContainer.addEventListener('click', e => {
        if (e.target.classList.contains('view-notes-btn')) showNotesView(e.target.dataset.title);
        if (e.target.classList.contains('start-review-btn')) startReview(e.target.dataset.title);
    });
    searchBar.addEventListener('input', e => { activeFilters.search = e.target.value.toLowerCase(); render(); });
    sortSelect.addEventListener('change', render);
    modalCloseBtn.addEventListener('click', () => reviewModal.classList.add('hidden'));
    nextCardBtn.addEventListener('click', () => { if (reviewState.currentIndex < reviewState.cards.length - 1) { reviewState.currentIndex++; displayReviewCard(); } });
    prevCardBtn.addEventListener('click', () => { if (reviewState.currentIndex > 0) { reviewState.currentIndex--; displayReviewCard(); } });
    reviewModal.querySelector('.btn-difficulty-hard').addEventListener('click', () => setCardDifficulty('hard'));
    reviewModal.querySelector('.btn-difficulty-easy').addEventListener('click', () => setCardDifficulty('easy'));
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);

    // --- Initial Load ---
    applyTheme(localStorage.getItem('theme') || 'light');
    showCollectionView();
});