document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const addCardForm = document.getElementById('add-card-form');
    const addCardBtn = document.getElementById('add-card-btn');

    const collectionView = document.getElementById('collection-view');
    const bookCollectionContainer = document.getElementById('book-collection-container');
    
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

    // --- Data & State ---
    let flashcards = JSON.parse(localStorage.getItem('bookNotesFlashcards')) || [];
    let reviewState = { cards: [], currentIndex: 0 };

    // --- Functions ---

    const saveFlashcards = () => {
        localStorage.setItem('bookNotesFlashcards', JSON.stringify(flashcards));
    };
    
    // --- View Management ---

    const showCollectionView = () => {
        collectionView.classList.remove('hidden');
        notesView.classList.add('hidden');
        displayBooks();
    };

    const showNotesView = (bookTitle) => {
        collectionView.classList.add('hidden');
        notesView.classList.remove('hidden');
        notesViewTitle.textContent = `Notes for "${escapeHTML(bookTitle)}"`;
        
        const cardsForBook = flashcards.filter(card => card.book === bookTitle);
        displayFlashcards(cardsForBook);
    };

    // --- Display Logic ---

    const displayBooks = () => {
        bookCollectionContainer.innerHTML = '';
        const books = groupFlashcardsByBook();

        if (Object.keys(books).length === 0) {
            bookCollectionContainer.innerHTML = '<p>Your collection is empty. Add a note to start!</p>';
            return;
        }

        for (const title in books) {
            const bookData = books[title];
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
                        <button class="btn btn-secondary view-notes-btn">View Notes</button>
                        <button class="btn btn-action start-review-btn">Start Review</button>
                    </div>
                </div>
            `;
            bookItem.querySelector('.view-notes-btn').addEventListener('click', () => showNotesView(title));
            bookItem.querySelector('.start-review-btn').addEventListener('click', () => startReview(title));
            bookCollectionContainer.appendChild(bookItem);
        }
    };

    const displayFlashcards = (cardsToDisplay) => {
        flashcardContainer.innerHTML = '';
        if (!cardsToDisplay || cardsToDisplay.length === 0) return;

        cardsToDisplay.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'flashcard';
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">
                        <div class="card-content">${escapeHTML(card.front)}</div>
                    </div>
                    <div class="card-back">
                        <div class="card-content">${escapeHTML(card.back)}</div>
                    </div>
                </div>
                <button class="delete-btn" title="Delete this card">X</button>
            `;
            cardElement.addEventListener('click', () => cardElement.classList.toggle('flipped'));
            cardElement.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCard(card.id, card.book);
            });
            flashcardContainer.appendChild(cardElement);
        });
    };
    
    // --- Review Modal Logic ---

    const startReview = (bookTitle) => {
        reviewState.cards = flashcards.filter(card => card.book === bookTitle);
        if (reviewState.cards.length === 0) {
            alert("No notes available to review for this book.");
            return;
        }
        reviewState.currentIndex = 0;
        reviewModal.classList.remove('hidden');
        displayReviewCard();
    };

    const displayReviewCard = () => {
        const card = reviewState.cards[reviewState.currentIndex];
        reviewCardContainer.innerHTML = `
            <div class="flashcard" id="review-card">
                <div class="card-inner">
                    <div class="card-front"><div class="card-content">${escapeHTML(card.front)}</div></div>
                    <div class="card-back"><div class="card-content">${escapeHTML(card.back)}</div></div>
                </div>
            </div>
        `;
        reviewCardContainer.querySelector('.flashcard').addEventListener('click', (e) => e.currentTarget.classList.toggle('flipped'));
        
        // Update progress and button states
        reviewProgress.textContent = `Card ${reviewState.currentIndex + 1} of ${reviewState.cards.length}`;
        prevCardBtn.disabled = reviewState.currentIndex === 0;
        nextCardBtn.disabled = reviewState.currentIndex === reviewState.cards.length - 1;
    };
    
    // --- Data Handling ---

    const addCard = async (e) => {
        e.preventDefault();
        const book = document.getElementById('book-title').value.trim();
        const front = document.getElementById('card-front').value.trim();
        const back = document.getElementById('card-back').value.trim();
        if (!book || !front || !back) { alert('Please fill out all fields!'); return; }

        addCardBtn.disabled = true;
        addCardBtn.textContent = 'Saving...';
        
        try {
            const existingBookCards = flashcards.filter(c => c.book === book);
            let coverUrl = null;
            if (existingBookCards.length > 0) {
                coverUrl = existingBookCards[0].coverUrl; // Reuse existing cover
            } else {
                coverUrl = await getBookCover(book); // Fetch new cover
            }

            const newCard = { id: Date.now(), book, front, back, coverUrl };
            flashcards.unshift(newCard);
            saveFlashcards();
            displayBooks();
            addCardForm.reset();
        } catch(error) {
            alert("Error saving card.");
        } finally {
            addCardBtn.disabled = false;
            addCardBtn.textContent = 'Save Flashcard';
        }
    };
    
    const deleteCard = (cardId, bookTitle) => {
        if (confirm('Are you sure you want to delete this card?')) {
            flashcards = flashcards.filter(card => card.id !== cardId);
            saveFlashcards();
            // Refresh the current view
            if (!notesView.classList.contains('hidden')) {
                showNotesView(bookTitle);
            } else {
                displayBooks();
            }
        }
    };

    // --- Helper Functions ---

    const getBookCover = async (title) => {
        const formattedTitle = title.split(' ').join('+');
        const url = `https://openlibrary.org/search.json?q=${formattedTitle}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const bookWithCover = data.docs.find(doc => doc.cover_i);
            return bookWithCover ? `https://covers.openlibrary.org/b/id/${bookWithCover.cover_i}-M.jpg` : null;
        } catch (error) {
            console.error("Cover fetch error:", error);
            return null;
        }
    };
    
    const groupFlashcardsByBook = () => {
        return flashcards.reduce((acc, card) => {
            if (!acc[card.book]) {
                acc[card.book] = { cardCount: 0, coverUrl: card.coverUrl };
            }
            acc[card.book].cardCount++;
            return acc;
        }, {});
    };

    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    };

    // --- Event Listeners ---
    addCardForm.addEventListener('submit', addCard);
    backToCollectionBtn.addEventListener('click', showCollectionView);
    modalCloseBtn.addEventListener('click', () => reviewModal.classList.add('hidden'));
    nextCardBtn.addEventListener('click', () => {
        if(reviewState.currentIndex < reviewState.cards.length - 1) {
            reviewState.currentIndex++;
            displayReviewCard();
        }
    });
    prevCardBtn.addEventListener('click', () => {
        if(reviewState.currentIndex > 0) {
            reviewState.currentIndex--;
            displayReviewCard();
        }
    });

    // --- Initial Load ---
    showCollectionView();
});