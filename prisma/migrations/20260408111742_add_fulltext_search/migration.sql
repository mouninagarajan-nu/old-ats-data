-- Add search vector column
ALTER TABLE "Candidate" ADD COLUMN "search_vector" tsvector;

-- Populate it from relevant fields
UPDATE "Candidate" SET "search_vector" =
  setweight(to_tsvector('english', coalesce("firstName", '') || ' ' || coalesce("lastName", '')), 'A') ||
  setweight(to_tsvector('english', coalesce(array_to_string("skills", ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce("city", '') || ' ' || coalesce("state", '') || ' ' || coalesce("country", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("email", '')), 'D');

-- Create GIN index for fast full-text search
CREATE INDEX "candidate_search_idx" ON "Candidate" USING GIN ("search_vector");

-- Create trigger to auto-update on insert/update
CREATE OR REPLACE FUNCTION candidate_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('english', coalesce(NEW."firstName", '') || ' ' || coalesce(NEW."lastName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW."skills", ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."city", '') || ' ' || coalesce(NEW."state", '') || ' ' || coalesce(NEW."country", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW."email", '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_search_update
  BEFORE INSERT OR UPDATE ON "Candidate"
  FOR EACH ROW EXECUTE FUNCTION candidate_search_vector_update();
