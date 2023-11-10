create table
  _tabito_db_state (schemaVersion integer not null unique);

insert into
  _tabito_db_state (schemaVersion)
values
  (1);

create table
  user (
    id INTEGER PRIMARY KEY not null,
    displayName text not null
  );

create table
  userProvider (
    userId integer not null,
    providerName string not null,
    providerId string not null,
    unique (userId, providerName, providerId)
  );

create table
  document (
    id integer primary key not null,
    title text not null,
    authorId integer not null, -- foreign key `user.id`
    shareStatus text not null
  );

create table
  sentence (
    id INTEGER PRIMARY KEY not null,
    jsonEncoded text not null, -- this will have furigana, translations, etc.
    plain text not null, -- this is the mainline
    plainSha256 text not null, -- might be useful for looking up
    authorId integer not null, -- foreign key: `user.id`
    documentId integer not null, -- foreign key: `document.id`
    unique (plain, documentId)
  );

create table
  sentenceShare (
    sentenceId integer not null,
    userId integer not null,
    unique (sentenceId, userId)
  );