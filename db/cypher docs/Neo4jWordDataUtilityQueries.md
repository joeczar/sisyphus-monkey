
# Utility Cypher Queries for Neo4j Word Data Management

This document provides a set of utility Cypher queries for managing and querying word data in a Neo4j database.

## Retrieve All Words

To fetch all word nodes from the database:

\```cypher
MATCH (w:Word)
RETURN w
\```

## Count Total Words

To count the total number of words stored in the database:

\```cypher
MATCH (w:Word)
RETURN count(w) AS TotalWords
\```

## Words by Packet Number

To retrieve all words belonging to a specific packet number, replace `$packetNr` with the desired packet number:

\```cypher
MATCH (w:Word)
WHERE w.packetNr = $packetNr
RETURN w
ORDER BY w.wordNr ASC
\```

## Words Linked by Specific Relationship

To find pairs of words linked by a specific relationship (e.g., `NEXT_WORD`), showing how to traverse a relationship:

\```cypher
MATCH (w1:Word)-[:NEXT_WORD]->(w2:Word)
RETURN w1.word, w2.word
\```

## Words with Specific Meaning or Metadata

To retrieve words based on specific meaning or metadata attributes (e.g., words associated with a certain 'feeling'), replace `$feeling` with the desired attribute value:

\```cypher
MATCH (w:Word)-[:HAS_METADATA]->(m:Metadata {feeling: $feeling})
RETURN w.word, m.feeling
\```

Remember to adjust query parameters (`$packetNr`, `$feeling`, etc.) according to your specific query needs.
