create table
  _tabito_db_state (schemaVersion integer not null unique);

insert into
  _tabito_db_state (schemaVersion)
values
  (1);

create table
  sentence (
    id INTEGER PRIMARY KEY not null,
    jsonEncoded text not null, -- this will have furigana, translations, etc.
    plain text unique not null, -- this is the mainline, unqiue for now
    plainSha256 text unique not null -- might be useful for looking up
  );

create table
  document (
    id INTEGER PRIMARY KEY not null,
    docName text not null,
    plain text not null, -- foreign key: sentence.plain
    unique (docName, plain)
  );

-- create table
--   user (
--     id INTEGER PRIMARY KEY not null,
--     displayName text not null
--   );
-- create table
--   userProvider (
--     userId integer not null,
--     providerName string not null,
--     providerId string not null,
--     unique (userId, providerName, providerId)
--   );