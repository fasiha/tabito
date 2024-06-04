create table
  _tabito_db_state (schemaVersion integer not null unique);

insert into
  _tabito_db_state (schemaVersion)
values
  (1);

create table
  sentence (
    id INTEGER PRIMARY KEY AUTOINCREMENT not null,
    addedMs integer not null,
    jsonEncoded text not null, -- this will have furigana, translations, etc.
    plain text unique not null, -- this is the mainline, unqiue for now
    plainSha256 text unique not null -- might be useful for looking up
  );

create table
  document (
    id INTEGER PRIMARY KEY AUTOINCREMENT not null,
    addedMs integer not null,
    docName text not null,
    plain text not null, -- foreign key: sentence.plain
    unique (docName, plain)
  );

create table
  connectedWords (
    addedMs integer not null,
    type text not null, -- equivalent, confuser, related?
    componentId text not null,
    wordId text not null,
    primary key (type, componentId, wordId),
    unique (type, wordId)
  );

create index connectedQuickcheck on connectedwords (type, wordId);

create table
  parentChildWords (
    addedMs integer not null,
    type text not null,
    parentId text not null,
    childId text not null,
    childSensesJson text not null,
    primary key (type, parentId, childId)
  );

create index childToParent on parentChildWords (type, childId);

-- partial cache so (otherwise, go to curtiz-japanese-nlp server)
create table
  jmdict (
    wordId text primary key not null,
    addedMs integer not null,
    json text not null
  );

create table
  user (
    id INTEGER PRIMARY KEY AUTOINCREMENT not null,
    displayName text unique not null, -- unique for now
    addedMs integer not null
  );

-- create table
--   userProvider (
--     userId integer not null,
--     providerName string not null,
--     providerId string not null,
--     unique (userId, providerName, providerId)
--   );