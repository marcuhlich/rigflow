


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."item_condition" AS ENUM (
    'verfügbar',
    'verliehen',
    'in-einsatz',
    'defekt'
);


ALTER TYPE "public"."item_condition" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'draft',
    'planned',
    'packed',
    'transit',
    'live',
    'returning',
    'archived'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."init_category_default_attributes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert default enabled attributes for all categories
  INSERT INTO public.category_attributes (user_id, category_id, attribute_key, enabled)
  VALUES
    (NEW.user_id, NEW.name, 'weight_kg', true),
    (NEW.user_id, NEW.name, 'units_per_case', true),
    (NEW.user_id, NEW.name, 'dimensions_cm', true),
    (NEW.user_id, NEW.name, 'unit_price', true),
    (NEW.user_id, NEW.name, 'image_url', true),
    (NEW.user_id, NEW.name, 'attributes', true),
    (NEW.user_id, NEW.name, 'tags', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."init_category_default_attributes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_demo_user"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = _user_id AND email = 'demo@rigflow.app'
  );
$$;


ALTER FUNCTION "public"."is_demo_user"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_categories"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_categories (user_id, name, is_dmx_capable, sort_order) VALUES
    (NEW.id, 'Kabel', false, 0),
    (NEW.id, 'Lautsprecher', false, 1),
    (NEW.id, 'Lichttechnik', true, 2),
    (NEW.id, 'Mikrofone', false, 3),
    (NEW.id, 'Zubehör', false, 4),
    (NEW.id, 'Effektgeräte', true, 5);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."seed_default_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid",
    "action" "text" NOT NULL,
    "item_name" "text",
    "changes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_dmx_capable" boolean DEFAULT false NOT NULL,
    "color" "text" DEFAULT '#6b7280'::"text" NOT NULL,
    "icon" "text" DEFAULT 'Package'::"text" NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_attributes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "text" NOT NULL,
    "attribute_key" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."category_attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "item_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklist_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklists_type_check" CHECK (("type" = ANY (ARRAY['pre-event'::"text", 'post-event'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dmx_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "instance_number" integer NOT NULL,
    "dmx_start_address" integer NOT NULL,
    "dmx_universe" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dmx_instances_dmx_start_address_check" CHECK ((("dmx_start_address" >= 1) AND ("dmx_start_address" <= 512)))
);


ALTER TABLE "public"."dmx_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_set_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "set_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_set_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_date_start" "date",
    "event_date_end" "date",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."event_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'offen'::"text" NOT NULL,
    "votes" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_requests_status_check" CHECK (("status" = ANY (ARRAY['offen'::"text", 'geplant'::"text", 'in_arbeit'::"text", 'umgesetzt'::"text", 'abgelehnt'::"text"])))
);


ALTER TABLE "public"."feature_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "condition" "public"."item_condition" DEFAULT 'verfügbar'::"public"."item_condition" NOT NULL,
    "location" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lent_to" "text",
    "lent_until" "date",
    "accessories" "text",
    "dmx_start_address" integer,
    "dmx_channels" integer,
    "dmx_universe" integer,
    "unit_price" numeric(10,2),
    "image_url" "text",
    "deleted_at" timestamp with time zone,
    "attributes" "jsonb",
    "maintenance_interval_days" integer,
    "weight_kg" numeric,
    "units_per_case" integer,
    "dimensions_cm" "jsonb"
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_tags" (
    "item_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."item_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lending_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "lent_to" "text" NOT NULL,
    "lent_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date",
    "returned_at" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lending_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "performed_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "type" "text" DEFAULT 'check'::"text" NOT NULL,
    "notes" "text",
    "cost" numeric(10,2),
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."maintenance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mfa_recovery_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mfa_recovery_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."package_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "package_id" "uuid" NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "package_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."package_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#34d399'::"text" NOT NULL,
    "icon" "text" DEFAULT 'package'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_dmx_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "instance_number" integer DEFAULT 1 NOT NULL,
    "dmx_start_address" integer NOT NULL,
    "dmx_universe" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_dmx_instances_dmx_start_address_check" CHECK ((("dmx_start_address" >= 1) AND ("dmx_start_address" <= 512))),
    CONSTRAINT "project_dmx_instances_dmx_universe_check" CHECK (("dmx_universe" >= 1))
);


ALTER TABLE "public"."project_dmx_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_dmx_patches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "instance_number" integer DEFAULT 1 NOT NULL,
    "dmx_start_address" integer NOT NULL,
    "dmx_universe" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_dmx_patches_dmx_start_address_check" CHECK ((("dmx_start_address" >= 1) AND ("dmx_start_address" <= 512))),
    CONSTRAINT "project_dmx_patches_dmx_universe_check" CHECK (("dmx_universe" >= 1))
);


ALTER TABLE "public"."project_dmx_patches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "packed" boolean DEFAULT false NOT NULL,
    "source" "text" DEFAULT 'direct'::"text" NOT NULL,
    "package_instance_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "condition" "text" DEFAULT 'ok'::"text",
    "original_location" "text",
    CONSTRAINT "project_items_condition_check" CHECK (("condition" = ANY (ARRAY['ok'::"text", 'damaged'::"text", 'missing'::"text"]))),
    CONSTRAINT "project_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "project_items_source_check" CHECK (("source" = ANY (ARRAY['direct'::"text", 'package'::"text"])))
);


ALTER TABLE "public"."project_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "package_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_todos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "done" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_todos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."project_status" DEFAULT 'draft'::"public"."project_status" NOT NULL,
    "event_date_start" timestamp with time zone,
    "event_date_end" timestamp with time zone,
    "location" "text",
    "notes" "text",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_attributes"
    ADD CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_attributes"
    ADD CONSTRAINT "category_attributes_user_id_category_id_attribute_key_key" UNIQUE ("user_id", "category_id", "attribute_key");



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dmx_instances"
    ADD CONSTRAINT "dmx_instances_item_id_instance_number_key" UNIQUE ("item_id", "instance_number");



ALTER TABLE ONLY "public"."dmx_instances"
    ADD CONSTRAINT "dmx_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_set_items"
    ADD CONSTRAINT "event_set_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_set_items"
    ADD CONSTRAINT "event_set_items_set_id_item_id_key" UNIQUE ("set_id", "item_id");



ALTER TABLE ONLY "public"."event_sets"
    ADD CONSTRAINT "event_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_votes"
    ADD CONSTRAINT "feature_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_votes"
    ADD CONSTRAINT "feature_votes_request_id_user_id_key" UNIQUE ("request_id", "user_id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_tags"
    ADD CONSTRAINT "item_tags_pkey" PRIMARY KEY ("item_id", "tag_id");



ALTER TABLE ONLY "public"."lending_history"
    ADD CONSTRAINT "lending_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mfa_recovery_codes"
    ADD CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."package_items"
    ADD CONSTRAINT "package_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."project_dmx_instances"
    ADD CONSTRAINT "project_dmx_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_dmx_instances"
    ADD CONSTRAINT "project_dmx_instances_project_id_item_id_instance_number_key" UNIQUE ("project_id", "item_id", "instance_number");



ALTER TABLE ONLY "public"."project_dmx_patches"
    ADD CONSTRAINT "project_dmx_patches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_items"
    ADD CONSTRAINT "project_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_packages"
    ADD CONSTRAINT "project_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_todos"
    ADD CONSTRAINT "project_todos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_user_id_name_key" UNIQUE ("user_id", "name");



CREATE INDEX "idx_audit_log_created_at" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_user_id" ON "public"."audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_maintenance_records_item_performed" ON "public"."maintenance_records" USING "btree" ("item_id", "performed_at" DESC);



CREATE INDEX "idx_mfa_recovery_codes_hash" ON "public"."mfa_recovery_codes" USING "btree" ("user_id", "code_hash");



CREATE INDEX "idx_mfa_recovery_codes_user_unused" ON "public"."mfa_recovery_codes" USING "btree" ("user_id", "used_at") WHERE ("used_at" IS NULL);



CREATE INDEX "idx_package_items_package_id" ON "public"."package_items" USING "btree" ("package_id");



CREATE INDEX "idx_packages_user_id" ON "public"."packages" USING "btree" ("user_id");



CREATE INDEX "idx_project_dmx_instances_project_id" ON "public"."project_dmx_instances" USING "btree" ("project_id");



CREATE INDEX "idx_project_dmx_project" ON "public"."project_dmx_patches" USING "btree" ("project_id");



CREATE INDEX "idx_project_items_project" ON "public"."project_items" USING "btree" ("project_id");



CREATE INDEX "idx_project_items_source" ON "public"."project_items" USING "btree" ("source");



CREATE INDEX "idx_project_packages_project" ON "public"."project_packages" USING "btree" ("project_id");



CREATE INDEX "idx_project_todos_project" ON "public"."project_todos" USING "btree" ("project_id");



CREATE INDEX "idx_projects_deleted_at" ON "public"."projects" USING "btree" ("deleted_at");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "packages_updated_at" BEFORE UPDATE ON "public"."packages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "project_dmx_instances_updated_at" BEFORE UPDATE ON "public"."project_dmx_instances" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "project_dmx_patches_updated_at" BEFORE UPDATE ON "public"."project_dmx_patches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "project_todos_updated_at" BEFORE UPDATE ON "public"."project_todos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_category_attributes_updated_at" BEFORE UPDATE ON "public"."category_attributes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checklist_items_updated_at" BEFORE UPDATE ON "public"."checklist_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checklists_updated_at" BEFORE UPDATE ON "public"."checklists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_sets_updated_at" BEFORE UPDATE ON "public"."event_sets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_items_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."category_attributes"
    ADD CONSTRAINT "category_attributes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dmx_instances"
    ADD CONSTRAINT "dmx_instances_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_set_items"
    ADD CONSTRAINT "event_set_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_set_items"
    ADD CONSTRAINT "event_set_items_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."event_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_votes"
    ADD CONSTRAINT "feature_votes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_votes"
    ADD CONSTRAINT "feature_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_tags"
    ADD CONSTRAINT "item_tags_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_tags"
    ADD CONSTRAINT "item_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lending_history"
    ADD CONSTRAINT "lending_history_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mfa_recovery_codes"
    ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."package_items"
    ADD CONSTRAINT "package_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."package_items"
    ADD CONSTRAINT "package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."packages"
    ADD CONSTRAINT "packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_dmx_instances"
    ADD CONSTRAINT "project_dmx_instances_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_dmx_instances"
    ADD CONSTRAINT "project_dmx_instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_dmx_patches"
    ADD CONSTRAINT "project_dmx_patches_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_dmx_patches"
    ADD CONSTRAINT "project_dmx_patches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_items"
    ADD CONSTRAINT "project_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_items"
    ADD CONSTRAINT "project_items_package_instance_id_fkey" FOREIGN KEY ("package_instance_id") REFERENCES "public"."project_packages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_items"
    ADD CONSTRAINT "project_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_packages"
    ADD CONSTRAINT "project_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_packages"
    ADD CONSTRAINT "project_packages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_todos"
    ADD CONSTRAINT "project_todos_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_todos"
    ADD CONSTRAINT "project_todos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins können Requests löschen" ON "public"."feature_requests" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Eingeloggte können Requests erstellen" ON "public"."feature_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Eingeloggte können Requests sehen" ON "public"."feature_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Eingeloggte können Votes sehen" ON "public"."feature_votes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Eingeloggte können eigene Votes löschen" ON "public"."feature_votes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Eingeloggte können eigene Votes setzen" ON "public"."feature_votes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Eingeloggte können feature_requests updaten" ON "public"."feature_requests" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can add items to their sets" ON "public"."event_set_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."event_sets"
  WHERE (("event_sets"."id" = "event_set_items"."set_id") AND ("event_sets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create dmx instances for their items" ON "public"."dmx_instances" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."inventory_items"
  WHERE (("inventory_items"."id" = "dmx_instances"."item_id") AND ("inventory_items"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create items in their checklists" ON "public"."checklist_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."checklists"
  WHERE (("checklists"."id" = "checklist_items"."checklist_id") AND ("checklists"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own audit logs" ON "public"."audit_log" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own category attributes" ON "public"."category_attributes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own checklists" ON "public"."checklists" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own inventory items" ON "public"."inventory_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own lending history" ON "public"."lending_history" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own sets" ON "public"."event_sets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete items from their checklists" ON "public"."checklist_items" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."checklists"
  WHERE (("checklists"."id" = "checklist_items"."checklist_id") AND ("checklists"."user_id" = "auth"."uid"())))) AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can delete items from their sets" ON "public"."event_set_items" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."event_sets"
  WHERE (("event_sets"."id" = "event_set_items"."set_id") AND ("event_sets"."user_id" = "auth"."uid"())))) AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can delete their own category attributes" ON "public"."category_attributes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own checklists" ON "public"."checklists" FOR DELETE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can delete their own dmx instances" ON "public"."dmx_instances" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."inventory_items"
  WHERE (("inventory_items"."id" = "dmx_instances"."item_id") AND ("inventory_items"."user_id" = "auth"."uid"())))) AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can delete their own inventory items" ON "public"."inventory_items" FOR DELETE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can delete their own lending history" ON "public"."lending_history" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can delete their own sets" ON "public"."event_sets" FOR DELETE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their project DMX instances" ON "public"."project_dmx_instances" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_dmx_instances"."project_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update items in their checklists" ON "public"."checklist_items" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."checklists"
  WHERE (("checklists"."id" = "checklist_items"."checklist_id") AND ("checklists"."user_id" = "auth"."uid"())))) AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update items in their sets" ON "public"."event_set_items" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."event_sets"
  WHERE (("event_sets"."id" = "event_set_items"."set_id") AND ("event_sets"."user_id" = "auth"."uid"())))) AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update their own category attributes" ON "public"."category_attributes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own checklists" ON "public"."checklists" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update their own dmx instances" ON "public"."dmx_instances" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."inventory_items"
  WHERE (("inventory_items"."id" = "dmx_instances"."item_id") AND ("inventory_items"."user_id" = "auth"."uid"())))) AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update their own inventory items" ON "public"."inventory_items" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update their own lending history" ON "public"."lending_history" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can update their own sets" ON "public"."event_sets" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND (NOT "public"."is_demo_user"("auth"."uid"()))));



CREATE POLICY "Users can view items in their sets" ON "public"."event_set_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."event_sets"
  WHERE (("event_sets"."id" = "event_set_items"."set_id") AND ("event_sets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view items of their checklists" ON "public"."checklist_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."checklists"
  WHERE (("checklists"."id" = "checklist_items"."checklist_id") AND ("checklists"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own category attributes" ON "public"."category_attributes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own checklists" ON "public"."checklists" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own dmx instances" ON "public"."dmx_instances" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inventory_items"
  WHERE (("inventory_items"."id" = "dmx_instances"."item_id") AND ("inventory_items"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own inventory" ON "public"."inventory_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own lending history" ON "public"."lending_history" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sets" ON "public"."event_sets" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_read_all" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."category_attributes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dmx_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_set_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_tags_own" ON "public"."item_tags" USING ((EXISTS ( SELECT 1
   FROM "public"."inventory_items"
  WHERE (("inventory_items"."id" = "item_tags"."item_id") AND ("inventory_items"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."lending_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "maintenance_records_user_policy" ON "public"."maintenance_records" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."mfa_recovery_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."package_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "package_items_owner" ON "public"."package_items" USING (("package_id" IN ( SELECT "packages"."id"
   FROM "public"."packages"
  WHERE ("packages"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "packages_owner" ON "public"."packages" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_dmx_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_dmx_patches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_dmx_patches_owner" ON "public"."project_dmx_patches" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."project_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_items_owner" ON "public"."project_items" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."project_packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_packages_owner" ON "public"."project_packages" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."project_todos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_todos_owner" ON "public"."project_todos" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_owner" ON "public"."projects" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_own" ON "public"."tags" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_select_own_count" ON "public"."mfa_recovery_codes" FOR SELECT USING (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."init_category_default_attributes"() TO "anon";
GRANT ALL ON FUNCTION "public"."init_category_default_attributes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."init_category_default_attributes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_demo_user"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_demo_user"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_demo_user"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_attributes" TO "anon";
GRANT ALL ON TABLE "public"."category_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."category_attributes" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_items" TO "service_role";



GRANT ALL ON TABLE "public"."checklists" TO "anon";
GRANT ALL ON TABLE "public"."checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."checklists" TO "service_role";



GRANT ALL ON TABLE "public"."dmx_instances" TO "anon";
GRANT ALL ON TABLE "public"."dmx_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."dmx_instances" TO "service_role";



GRANT ALL ON TABLE "public"."event_set_items" TO "anon";
GRANT ALL ON TABLE "public"."event_set_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_set_items" TO "service_role";



GRANT ALL ON TABLE "public"."event_sets" TO "anon";
GRANT ALL ON TABLE "public"."event_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."event_sets" TO "service_role";



GRANT ALL ON TABLE "public"."feature_requests" TO "anon";
GRANT ALL ON TABLE "public"."feature_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_requests" TO "service_role";



GRANT ALL ON TABLE "public"."feature_votes" TO "anon";
GRANT ALL ON TABLE "public"."feature_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_votes" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."item_tags" TO "anon";
GRANT ALL ON TABLE "public"."item_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."item_tags" TO "service_role";



GRANT ALL ON TABLE "public"."lending_history" TO "anon";
GRANT ALL ON TABLE "public"."lending_history" TO "authenticated";
GRANT ALL ON TABLE "public"."lending_history" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_records" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_records" TO "service_role";



GRANT ALL ON TABLE "public"."mfa_recovery_codes" TO "anon";
GRANT ALL ON TABLE "public"."mfa_recovery_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."mfa_recovery_codes" TO "service_role";



GRANT ALL ON TABLE "public"."package_items" TO "anon";
GRANT ALL ON TABLE "public"."package_items" TO "authenticated";
GRANT ALL ON TABLE "public"."package_items" TO "service_role";



GRANT ALL ON TABLE "public"."packages" TO "anon";
GRANT ALL ON TABLE "public"."packages" TO "authenticated";
GRANT ALL ON TABLE "public"."packages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_dmx_instances" TO "anon";
GRANT ALL ON TABLE "public"."project_dmx_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."project_dmx_instances" TO "service_role";



GRANT ALL ON TABLE "public"."project_dmx_patches" TO "anon";
GRANT ALL ON TABLE "public"."project_dmx_patches" TO "authenticated";
GRANT ALL ON TABLE "public"."project_dmx_patches" TO "service_role";



GRANT ALL ON TABLE "public"."project_items" TO "anon";
GRANT ALL ON TABLE "public"."project_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_items" TO "service_role";



GRANT ALL ON TABLE "public"."project_packages" TO "anon";
GRANT ALL ON TABLE "public"."project_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."project_packages" TO "service_role";



GRANT ALL ON TABLE "public"."project_todos" TO "anon";
GRANT ALL ON TABLE "public"."project_todos" TO "authenticated";
GRANT ALL ON TABLE "public"."project_todos" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































