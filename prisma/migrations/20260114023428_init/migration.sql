-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeckItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "notionPageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastReviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeckItem_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeckConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "frontMode" TEXT NOT NULL DEFAULT 'word_infinitive',
    "backMode" TEXT NOT NULL DEFAULT 'translation_ru',
    "direction" TEXT NOT NULL DEFAULT 'forward',
    CONSTRAINT "DeckConfig_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DeckItem_deckId_notionPageId_key" ON "DeckItem"("deckId", "notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckConfig_deckId_key" ON "DeckConfig"("deckId");
