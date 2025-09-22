--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 16.2 (Ubuntu 16.2-1.pgdg22.04+1)

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

--
-- Name: cleanup_audit_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_audit_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
      DECLARE
        retention_days INTEGER;
      BEGIN
        SELECT (setting_value::text)::integer INTO retention_days 
        FROM audit_settings WHERE setting_key = 'retention_days';
        
        DELETE FROM user_activity_logs 
        WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
        
        DELETE FROM security_events 
        WHERE created_at < NOW() - INTERVAL '1 day' * retention_days AND resolved = true;
      END;
      $$;


ALTER FUNCTION public.cleanup_audit_logs() OWNER TO postgres;

--
-- Name: update_customers_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_customers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_customers_updated_at() OWNER TO postgres;

--
-- Name: update_origins_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_origins_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_origins_updated_at() OWNER TO postgres;

--
-- Name: update_pricing_rules_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_pricing_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_pricing_rules_updated_at() OWNER TO postgres;

--
-- Name: update_sales_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sales_orders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_sales_orders_updated_at() OWNER TO postgres;

--
-- Name: update_sales_returns_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sales_returns_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_sales_returns_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approval_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_history (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    action character varying(20) NOT NULL,
    performed_by integer NOT NULL,
    performed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    previous_status character varying(20),
    new_status character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT approval_history_action_check CHECK (((action)::text = ANY ((ARRAY['submitted'::character varying, 'approved'::character varying, 'rejected'::character varying, 'revised'::character varying])::text[]))),
    CONSTRAINT approval_history_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['purchase_order'::character varying, 'payment'::character varying, 'expense'::character varying])::text[])))
);


ALTER TABLE public.approval_history OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_history_id_seq OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_history_id_seq OWNED BY public.approval_history.id;


--
-- Name: audit_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    updated_by integer,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_settings OWNER TO postgres;

--
-- Name: audit_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_settings_id_seq OWNER TO postgres;

--
-- Name: audit_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_settings_id_seq OWNED BY public.audit_settings.id;


--
-- Name: brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.brands (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.brands OWNER TO postgres;

--
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.brands_id_seq OWNER TO postgres;

--
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: customer_code_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_code_seq OWNER TO postgres;

--
-- Name: customer_due_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_due_transactions (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    sales_order_id integer,
    transaction_type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_before numeric(12,2) DEFAULT 0 NOT NULL,
    balance_after numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method character varying(20),
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_due_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT customer_due_transactions_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'bank_transfer'::character varying, 'check'::character varying])::text[]))),
    CONSTRAINT customer_due_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['charge'::character varying, 'payment'::character varying, 'adjustment'::character varying])::text[])))
);


ALTER TABLE public.customer_due_transactions OWNER TO postgres;

--
-- Name: customer_due_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_due_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_due_transactions_id_seq OWNER TO postgres;

--
-- Name: customer_due_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_due_transactions_id_seq OWNED BY public.customer_due_transactions.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    customer_code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    state character varying(100),
    zip_code character varying(20),
    country character varying(100),
    date_of_birth date,
    gender character varying(10),
    customer_type character varying(20) DEFAULT 'regular'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    total_purchases numeric(12,2) DEFAULT 0,
    loyalty_points integer DEFAULT 0,
    last_purchase_date date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    due_amount numeric(12,2) DEFAULT 0,
    credit_limit numeric(12,2) DEFAULT 0,
    last_payment_date timestamp with time zone,
    CONSTRAINT customers_credit_limit_check CHECK ((credit_limit >= (0)::numeric)),
    CONSTRAINT customers_customer_type_check CHECK (((customer_type)::text = ANY ((ARRAY['regular'::character varying, 'vip'::character varying, 'wholesale'::character varying, 'walk_in'::character varying])::text[]))),
    CONSTRAINT customers_due_amount_check CHECK ((due_amount >= (0)::numeric)),
    CONSTRAINT customers_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT customers_loyalty_points_check CHECK ((loyalty_points >= 0)),
    CONSTRAINT customers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying])::text[]))),
    CONSTRAINT customers_total_purchases_check CHECK ((total_purchases >= (0)::numeric))
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: data_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_changes (
    id integer NOT NULL,
    activity_log_id integer,
    table_name character varying(100) NOT NULL,
    record_id integer NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    data_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.data_changes OWNER TO postgres;

--
-- Name: data_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_changes_id_seq OWNER TO postgres;

--
-- Name: data_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_changes_id_seq OWNED BY public.data_changes.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expense_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_number_seq OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    expense_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    expense_date date NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    vendor_name character varying(255),
    vendor_contact character varying(255),
    receipt_number character varying(100),
    receipt_url character varying(500),
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    paid_by integer,
    paid_at timestamp without time zone,
    department character varying(100),
    project character varying(100),
    tags text[],
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    submitted_at timestamp with time zone,
    submitted_by integer,
    approval_status character varying(20) DEFAULT 'draft'::character varying,
    approval_notes text,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expenses_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT expenses_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'paid'::character varying])::text[])))
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;



--
-- Name: invoice_number_sequence; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_number_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_number_sequence OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    purchase_order_id integer,
    supplier_id integer NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0,
    outstanding_amount numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    terms character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invoices_outstanding_amount_check CHECK ((outstanding_amount >= (0)::numeric)),
    CONSTRAINT invoices_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT invoices_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: origins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.origins (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT origins_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.origins OWNER TO postgres;

--
-- Name: origins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.origins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.origins_id_seq OWNER TO postgres;

--
-- Name: origins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.origins_id_seq OWNED BY public.origins.id;


--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_history (
    id integer NOT NULL,
    payment_id integer,
    invoice_id integer,
    event character varying(100) NOT NULL,
    description text,
    old_value text,
    new_value text,
    user_name character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_history OWNER TO postgres;

--
-- Name: payment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_history_id_seq OWNER TO postgres;

--
-- Name: payment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_history_id_seq OWNED BY public.payment_history.id;


--
-- Name: payment_number_sequence; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_number_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_number_sequence OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    payment_number character varying(50) NOT NULL,
    invoice_id integer,
    supplier_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) NOT NULL,
    reference character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    notes text,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    submitted_at timestamp with time zone,
    submitted_by integer,
    approved_at timestamp with time zone,
    approved_by integer,
    approval_status character varying(20) DEFAULT 'draft'::character varying,
    approval_notes text,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    description text,
    module character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    resource character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: po_number_sequence; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_number_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_number_sequence OWNER TO postgres;

--
-- Name: pricing_rule_code_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pricing_rule_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pricing_rule_code_seq OWNER TO postgres;

--
-- Name: pricing_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricing_rules (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    product_id integer,
    category_id integer,
    rule_type character varying(20) NOT NULL,
    rule_value numeric(10,2) NOT NULL,
    rule_percentage numeric(5,2),
    min_quantity numeric(10,2) DEFAULT 1,
    max_quantity numeric(10,2),
    start_date date NOT NULL,
    end_date date,
    customer_type character varying(20),
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pricing_rules_customer_type_check CHECK (((customer_type)::text = ANY ((ARRAY['regular'::character varying, 'vip'::character varying, 'wholesale'::character varying, 'walk_in'::character varying])::text[]))),
    CONSTRAINT pricing_rules_min_quantity_check CHECK ((min_quantity > (0)::numeric)),
    CONSTRAINT pricing_rules_rule_percentage_check CHECK (((rule_percentage >= (0)::numeric) AND (rule_percentage <= (100)::numeric))),
    CONSTRAINT pricing_rules_rule_type_check CHECK (((rule_type)::text = ANY ((ARRAY['discount'::character varying, 'markup'::character varying, 'fixed_price'::character varying])::text[])))
);


ALTER TABLE public.pricing_rules OWNER TO postgres;

--
-- Name: pricing_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pricing_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pricing_rules_id_seq OWNER TO postgres;

--
-- Name: pricing_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pricing_rules_id_seq OWNED BY public.pricing_rules.id;


--
-- Name: product_code_sequence; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_code_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_code_sequence OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    product_code character varying(20) NOT NULL,
    sku character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category_id integer NOT NULL,
    subcategory_id integer,
    brand_id integer,
    unit_of_measure character varying(20) NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    current_stock numeric(10,2) DEFAULT 0 NOT NULL,
    min_stock_level numeric(10,2) DEFAULT 0 NOT NULL,
    max_stock_level numeric(10,2),
    supplier_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    barcode character varying(50),
    weight numeric(8,2),
    dimensions character varying(100),
    tax_rate numeric(5,2),
    reorder_point numeric(10,2),
    reorder_quantity numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    warranty_period integer,
    service_time integer,
    origin_id integer,
    image_url character varying(500),
    CONSTRAINT products_cost_price_check CHECK ((cost_price >= (0)::numeric)),
    CONSTRAINT products_current_stock_check CHECK ((current_stock >= (0)::numeric)),
    CONSTRAINT products_max_stock_level_check CHECK ((max_stock_level >= (0)::numeric)),
    CONSTRAINT products_min_stock_level_check CHECK ((min_stock_level >= (0)::numeric)),
    CONSTRAINT products_reorder_point_check CHECK ((reorder_point >= (0)::numeric)),
    CONSTRAINT products_reorder_quantity_check CHECK ((reorder_quantity >= (0)::numeric)),
    CONSTRAINT products_selling_price_check CHECK ((selling_price >= (0)::numeric)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'discontinued'::character varying, 'out_of_stock'::character varying])::text[]))),
    CONSTRAINT products_tax_rate_check CHECK (((tax_rate >= (0)::numeric) AND (tax_rate <= (100)::numeric))),
    CONSTRAINT products_weight_check CHECK ((weight >= (0)::numeric))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: COLUMN products.warranty_period; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.warranty_period IS 'Warranty period in months';


--
-- Name: COLUMN products.service_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.service_time IS 'Service reminder interval in months';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_order_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_line_items (
    id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    product_id integer NOT NULL,
    product_sku character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    description text,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    received_quantity numeric(10,2) DEFAULT 0 NOT NULL,
    pending_quantity numeric(10,2) NOT NULL,
    unit_of_measure character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_order_line_items_pending_quantity_check CHECK ((pending_quantity >= (0)::numeric)),
    CONSTRAINT purchase_order_line_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_order_line_items_received_quantity_check CHECK ((received_quantity >= (0)::numeric)),
    CONSTRAINT purchase_order_line_items_total_price_check CHECK ((total_price >= (0)::numeric)),
    CONSTRAINT purchase_order_line_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.purchase_order_line_items OWNER TO postgres;

--
-- Name: purchase_order_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_order_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_line_items_id_seq OWNER TO postgres;

--
-- Name: purchase_order_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_order_line_items_id_seq OWNED BY public.purchase_order_line_items.id;


--
-- Name: purchase_order_timeline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_timeline (
    id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    event character varying(100) NOT NULL,
    description text,
    "user" character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_order_timeline_status_check CHECK (((status)::text = ANY ((ARRAY['completed'::character varying, 'pending'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.purchase_order_timeline OWNER TO postgres;

--
-- Name: purchase_order_timeline_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_order_timeline_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_timeline_id_seq OWNER TO postgres;

--
-- Name: purchase_order_timeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_order_timeline_id_seq OWNED BY public.purchase_order_timeline.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_number character varying(50) NOT NULL,
    supplier_id integer NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery_date date NOT NULL,
    actual_delivery_date date,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    priority character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    payment_terms character varying(50),
    delivery_terms character varying(50),
    department character varying(100),
    project character varying(100),
    notes text,
    created_by character varying(100) NOT NULL,
    approved_by character varying(100),
    approved_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    submitted_at timestamp with time zone,
    submitted_by integer,
    approved_at timestamp with time zone,
    approval_status character varying(20) DEFAULT 'draft'::character varying,
    approval_notes text,
    CONSTRAINT purchase_orders_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT purchase_orders_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'approved'::character varying, 'sent'::character varying, 'partially_received'::character varying, 'received'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT purchase_orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: return_inventory_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_inventory_adjustments (
    id bigint NOT NULL,
    return_id integer NOT NULL,
    return_item_id integer NOT NULL,
    product_id integer NOT NULL,
    adjustment_type character varying(20) DEFAULT 'return_restock'::character varying NOT NULL,
    quantity_adjusted numeric(10,2) NOT NULL,
    stock_before numeric(10,2) NOT NULL,
    stock_after numeric(10,2) NOT NULL,
    adjusted_by integer,
    adjustment_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT return_inventory_adjustments_adjustment_type_check CHECK (((adjustment_type)::text = ANY ((ARRAY['return_restock'::character varying, 'return_damaged'::character varying, 'return_write_off'::character varying])::text[])))
);


ALTER TABLE public.return_inventory_adjustments OWNER TO postgres;

--
-- Name: return_inventory_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.return_inventory_adjustments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.return_inventory_adjustments_id_seq OWNER TO postgres;

--
-- Name: return_inventory_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.return_inventory_adjustments_id_seq OWNED BY public.return_inventory_adjustments.id;


--
-- Name: return_refund_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_refund_transactions (
    id bigint NOT NULL,
    return_id integer NOT NULL,
    transaction_type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    transaction_reference character varying(100),
    payment_gateway_response text,
    transaction_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    processed_by integer,
    processed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT return_refund_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT return_refund_transactions_transaction_status_check CHECK (((transaction_status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT return_refund_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['cash_refund'::character varying, 'card_refund'::character varying, 'store_credit'::character varying, 'bank_transfer'::character varying])::text[])))
);


ALTER TABLE public.return_refund_transactions OWNER TO postgres;

--
-- Name: return_refund_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.return_refund_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.return_refund_transactions_id_seq OWNER TO postgres;

--
-- Name: return_refund_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.return_refund_transactions_id_seq OWNED BY public.return_refund_transactions.id;


--
-- Name: role_hierarchy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_hierarchy (
    id bigint NOT NULL,
    parent_role_id integer,
    child_role_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_hierarchy OWNER TO postgres;

--
-- Name: role_hierarchy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_hierarchy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_hierarchy_id_seq OWNER TO postgres;

--
-- Name: role_hierarchy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_hierarchy_id_seq OWNED BY public.role_hierarchy.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    permission_id integer,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    granted_by integer
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    description text,
    level integer DEFAULT 1 NOT NULL,
    department character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales_order_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_order_line_items (
    id integer NOT NULL,
    sales_order_id integer NOT NULL,
    product_id integer NOT NULL,
    product_sku character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_gift boolean DEFAULT false,
    CONSTRAINT sales_order_line_items_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT sales_order_line_items_discount_percentage_check CHECK (((discount_percentage >= (0)::numeric) AND (discount_percentage <= (100)::numeric))),
    CONSTRAINT sales_order_line_items_line_total_check CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT sales_order_line_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sales_order_line_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.sales_order_line_items OWNER TO postgres;

--
-- Name: sales_order_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_order_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_order_line_items_id_seq OWNER TO postgres;

--
-- Name: sales_order_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_order_line_items_id_seq OWNED BY public.sales_order_line_items.id;


--
-- Name: sales_order_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_order_number_seq OWNER TO postgres;

--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_orders (
    id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id integer,
    order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying(20),
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    cash_received numeric(12,2) DEFAULT 0,
    change_given numeric(12,2) DEFAULT 0,
    cashier_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    gift_count integer DEFAULT 0,
    due_amount numeric(12,2) DEFAULT 0,
    has_returns boolean DEFAULT false,
    total_returned_amount numeric(12,2) DEFAULT 0,
    return_count integer DEFAULT 0,
    CONSTRAINT sales_orders_cash_received_check CHECK ((cash_received >= (0)::numeric)),
    CONSTRAINT sales_orders_change_given_check CHECK ((change_given >= (0)::numeric)),
    CONSTRAINT sales_orders_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT sales_orders_due_amount_check CHECK ((due_amount >= (0)::numeric)),
    CONSTRAINT sales_orders_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'credit'::character varying, 'check'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT sales_orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'partially_paid'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT sales_orders_return_count_check CHECK ((return_count >= 0)),
    CONSTRAINT sales_orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT sales_orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_orders_tax_amount_check CHECK ((tax_amount >= (0)::numeric)),
    CONSTRAINT sales_orders_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT sales_orders_total_returned_amount_check CHECK ((total_returned_amount >= (0)::numeric))
);


ALTER TABLE public.sales_orders OWNER TO postgres;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_orders_id_seq OWNER TO postgres;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: sales_receipt_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_receipt_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_receipt_number_seq OWNER TO postgres;

--
-- Name: sales_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_receipts (
    id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    sales_order_id integer NOT NULL,
    receipt_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    receipt_type character varying(20) DEFAULT 'sale'::character varying,
    total_amount numeric(12,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    cashier_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_receipts_receipt_type_check CHECK (((receipt_type)::text = ANY ((ARRAY['sale'::character varying, 'refund'::character varying, 'exchange'::character varying])::text[]))),
    CONSTRAINT sales_receipts_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.sales_receipts OWNER TO postgres;

--
-- Name: sales_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_receipts_id_seq OWNER TO postgres;

--
-- Name: sales_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_receipts_id_seq OWNED BY public.sales_receipts.id;


--
-- Name: sales_return_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_return_items (
    id bigint NOT NULL,
    return_id integer NOT NULL,
    original_line_item_id integer NOT NULL,
    product_id integer NOT NULL,
    product_sku character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    original_quantity numeric(10,2) NOT NULL,
    returned_quantity numeric(10,2) NOT NULL,
    original_unit_price numeric(10,2) NOT NULL,
    refund_unit_price numeric(10,2) NOT NULL,
    line_refund_amount numeric(12,2) NOT NULL,
    item_condition character varying(20) DEFAULT 'good'::character varying NOT NULL,
    restockable boolean DEFAULT true NOT NULL,
    restock_fee numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_return_items_item_condition_check CHECK (((item_condition)::text = ANY ((ARRAY['good'::character varying, 'damaged'::character varying, 'defective'::character varying, 'opened'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT sales_return_items_line_refund_amount_check CHECK ((line_refund_amount >= (0)::numeric)),
    CONSTRAINT sales_return_items_original_quantity_check CHECK ((original_quantity > (0)::numeric)),
    CONSTRAINT sales_return_items_original_unit_price_check CHECK ((original_unit_price >= (0)::numeric)),
    CONSTRAINT sales_return_items_refund_unit_price_check CHECK ((refund_unit_price >= (0)::numeric)),
    CONSTRAINT sales_return_items_restock_fee_check CHECK ((restock_fee >= (0)::numeric)),
    CONSTRAINT sales_return_items_returned_quantity_check CHECK ((returned_quantity > (0)::numeric))
);


ALTER TABLE public.sales_return_items OWNER TO postgres;

--
-- Name: sales_return_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_return_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_return_items_id_seq OWNER TO postgres;

--
-- Name: sales_return_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_return_items_id_seq OWNED BY public.sales_return_items.id;


--
-- Name: sales_return_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_return_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_return_number_seq OWNER TO postgres;

--
-- Name: sales_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_returns (
    id bigint NOT NULL,
    return_number character varying(50) NOT NULL,
    original_order_id integer NOT NULL,
    original_order_number character varying(50) NOT NULL,
    return_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    return_type character varying(20) DEFAULT 'full'::character varying NOT NULL,
    reason character varying(100) NOT NULL,
    return_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    refund_method character varying(20),
    subtotal_returned numeric(12,2) DEFAULT 0 NOT NULL,
    tax_returned numeric(12,2) DEFAULT 0,
    total_refund_amount numeric(12,2) DEFAULT 0 NOT NULL,
    processing_fee numeric(12,2) DEFAULT 0,
    final_refund_amount numeric(12,2) DEFAULT 0 NOT NULL,
    customer_id integer,
    processed_by integer,
    authorized_by integer,
    notes text,
    receipt_number character varying(50),
    return_location character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    approved_by integer,
    rejected_by integer,
    CONSTRAINT sales_returns_final_refund_amount_check CHECK ((final_refund_amount >= (0)::numeric)),
    CONSTRAINT sales_returns_processing_fee_check CHECK ((processing_fee >= (0)::numeric)),
    CONSTRAINT sales_returns_reason_check CHECK (((reason)::text = ANY ((ARRAY['defective_product'::character varying, 'wrong_product'::character varying, 'customer_change_mind'::character varying, 'damaged_in_transit'::character varying, 'not_as_described'::character varying, 'duplicate_order'::character varying, 'quality_issue'::character varying, 'expired_product'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT sales_returns_refund_method_check CHECK (((refund_method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'store_credit'::character varying, 'original_method'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT sales_returns_return_status_check CHECK (((return_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT sales_returns_return_type_check CHECK (((return_type)::text = ANY ((ARRAY['full'::character varying, 'partial'::character varying])::text[]))),
    CONSTRAINT sales_returns_subtotal_returned_check CHECK ((subtotal_returned >= (0)::numeric)),
    CONSTRAINT sales_returns_tax_returned_check CHECK ((tax_returned >= (0)::numeric)),
    CONSTRAINT sales_returns_total_refund_amount_check CHECK ((total_refund_amount >= (0)::numeric))
);


ALTER TABLE public.sales_returns OWNER TO postgres;

--
-- Name: sales_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_returns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_returns_id_seq OWNER TO postgres;

--
-- Name: sales_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_returns_id_seq OWNED BY public.sales_returns.id;


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_events (
    id integer NOT NULL,
    user_id integer,
    event_type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying,
    ip_address inet,
    user_agent text,
    endpoint character varying(255),
    description text,
    metadata jsonb,
    resolved boolean DEFAULT false,
    resolved_by integer,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.security_events OWNER TO postgres;

--
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_events_id_seq OWNER TO postgres;

--
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    data_type character varying(20) DEFAULT 'string'::character varying NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_adjustments (
    id integer NOT NULL,
    product_id integer NOT NULL,
    adjustment_type character varying(20) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    previous_stock numeric(10,2) NOT NULL,
    new_stock numeric(10,2) NOT NULL,
    reason character varying(255) NOT NULL,
    reference character varying(100),
    notes text,
    adjusted_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stock_adjustments_adjustment_type_check CHECK (((adjustment_type)::text = ANY ((ARRAY['increase'::character varying, 'decrease'::character varying, 'set'::character varying])::text[])))
);


ALTER TABLE public.stock_adjustments OWNER TO postgres;

--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_adjustments_id_seq OWNER TO postgres;

--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_adjustments_id_seq OWNED BY public.stock_adjustments.id;


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: subcategories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcategories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcategories_id_seq OWNER TO postgres;

--
-- Name: subcategories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcategories_id_seq OWNED BY public.subcategories.id;


--
-- Name: supplier_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.supplier_categories OWNER TO postgres;

--
-- Name: supplier_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_categories_id_seq OWNER TO postgres;

--
-- Name: supplier_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_categories_id_seq OWNED BY public.supplier_categories.id;


--
-- Name: supplier_code_suppliers; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_code_suppliers
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_code_suppliers OWNER TO postgres;

--
-- Name: supplier_performance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_performance (
    id integer NOT NULL,
    supplier_id integer,
    delivery_time_days integer,
    quality_rating numeric(3,2),
    price_rating numeric(3,2),
    communication_rating numeric(3,2),
    issues_count integer DEFAULT 0,
    on_time_delivery_rate numeric(5,2) DEFAULT 0.00,
    recorded_date date DEFAULT CURRENT_DATE,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT supplier_performance_communication_rating_check CHECK (((communication_rating >= (0)::numeric) AND (communication_rating <= (5)::numeric))),
    CONSTRAINT supplier_performance_price_rating_check CHECK (((price_rating >= (0)::numeric) AND (price_rating <= (5)::numeric))),
    CONSTRAINT supplier_performance_quality_rating_check CHECK (((quality_rating >= (0)::numeric) AND (quality_rating <= (5)::numeric)))
);


ALTER TABLE public.supplier_performance OWNER TO postgres;

--
-- Name: supplier_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_performance_id_seq OWNER TO postgres;

--
-- Name: supplier_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_performance_id_seq OWNED BY public.supplier_performance.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    supplier_code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    website character varying(255),
    address text,
    city character varying(100),
    state character varying(100),
    zip_code character varying(20),
    country character varying(100),
    category character varying(100),
    tax_id character varying(100),
    vat_id character varying(100),
    payment_terms character varying(50),
    bank_name character varying(255),
    bank_account character varying(100),
    bank_routing character varying(100),
    swift_code character varying(20),
    iban character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    rating numeric(3,2) DEFAULT 0.00,
    total_orders integer DEFAULT 0,
    last_order_date date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    whatsapp_number character varying(50),
    CONSTRAINT suppliers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT suppliers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activity_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_id character varying(255),
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id integer,
    endpoint character varying(255),
    method character varying(10),
    ip_address inet,
    user_agent text,
    request_data jsonb,
    response_status integer,
    response_data jsonb,
    old_values jsonb,
    new_values jsonb,
    success boolean DEFAULT true,
    error_message text,
    duration_ms integer,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_activity_logs OWNER TO postgres;

--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activity_logs_id_seq OWNER TO postgres;

--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer,
    permission_id integer,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    granted_by integer,
    expires_at timestamp with time zone
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    ip_address inet,
    user_agent text,
    login_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    logout_at timestamp with time zone,
    last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    device_info jsonb,
    location_info jsonb
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_sessions_id_seq OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    mobile_number character varying(20),
    departments text[],
    role character varying(20) DEFAULT 'employee'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    email_verification_token character varying(255),
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role_id integer,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'manager'::character varying, 'accounts'::character varying, 'employee'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: approval_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history ALTER COLUMN id SET DEFAULT nextval('public.approval_history_id_seq'::regclass);


--
-- Name: audit_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_settings ALTER COLUMN id SET DEFAULT nextval('public.audit_settings_id_seq'::regclass);


--
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: customer_due_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_due_transactions ALTER COLUMN id SET DEFAULT nextval('public.customer_due_transactions_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: data_changes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_changes ALTER COLUMN id SET DEFAULT nextval('public.data_changes_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: origins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.origins ALTER COLUMN id SET DEFAULT nextval('public.origins_id_seq'::regclass);


--
-- Name: payment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history ALTER COLUMN id SET DEFAULT nextval('public.payment_history_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: pricing_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_rules ALTER COLUMN id SET DEFAULT nextval('public.pricing_rules_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchase_order_line_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_line_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_line_items_id_seq'::regclass);


--
-- Name: purchase_order_timeline id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_timeline ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_timeline_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: return_inventory_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_inventory_adjustments ALTER COLUMN id SET DEFAULT nextval('public.return_inventory_adjustments_id_seq'::regclass);


--
-- Name: return_refund_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_refund_transactions ALTER COLUMN id SET DEFAULT nextval('public.return_refund_transactions_id_seq'::regclass);


--
-- Name: role_hierarchy id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.role_hierarchy_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales_order_line_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_line_items ALTER COLUMN id SET DEFAULT nextval('public.sales_order_line_items_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: sales_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_receipts ALTER COLUMN id SET DEFAULT nextval('public.sales_receipts_id_seq'::regclass);


--
-- Name: sales_return_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_items ALTER COLUMN id SET DEFAULT nextval('public.sales_return_items_id_seq'::regclass);


--
-- Name: sales_returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns ALTER COLUMN id SET DEFAULT nextval('public.sales_returns_id_seq'::regclass);


--
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: stock_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustments_id_seq'::regclass);


--
-- Name: subcategories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories ALTER COLUMN id SET DEFAULT nextval('public.subcategories_id_seq'::regclass);


--
-- Name: supplier_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_categories ALTER COLUMN id SET DEFAULT nextval('public.supplier_categories_id_seq'::regclass);


--
-- Name: supplier_performance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_performance ALTER COLUMN id SET DEFAULT nextval('public.supplier_performance_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: approval_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: audit_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (1, 'retention_days', '365', 'Number of days to retain audit logs', NULL, '2025-09-21 02:42:00.332671+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (2, 'log_sensitive_data', 'false', 'Whether to log sensitive data in requests/responses', NULL, '2025-09-21 02:42:00.332671+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (3, 'track_read_operations', 'false', 'Whether to track read-only operations', NULL, '2025-09-21 02:42:00.332671+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (4, 'track_failed_requests', 'true', 'Whether to track failed requests', NULL, '2025-09-21 02:42:00.332671+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (5, 'excluded_endpoints', '[]', 'Array of endpoints to exclude from logging', NULL, '2025-09-21 02:42:00.332671+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (6, 'sensitive_fields', '["password", "token", "secret", "key", "ssn", "credit_card"]', 'Fields to exclude from logging', NULL, '2025-09-21 02:42:00.332671+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (14, 'logging_level', '{"api_calls": true, "data_changes": true, "authorization": true, "authentication": true}', 'What types of events to log', NULL, '2025-09-22 23:24:39.126214+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (16, 'alert_thresholds', '{"failed_logins": 5, "permission_denials": 10, "suspicious_activity": 3}', 'Thresholds for security alerts', NULL, '2025-09-22 23:24:39.126214+06');
INSERT INTO public.audit_settings (id, setting_key, setting_value, description, updated_by, updated_at) VALUES (17, 'auto_cleanup', '{"enabled": true, "cleanup_hour": 2}', 'Automatic cleanup of old audit data', NULL, '2025-09-22 23:24:39.126214+06');


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_due_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: data_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (1, 'Office Supplies', 'Office equipment, stationery, and supplies', '#3B82F6', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (2, 'Travel & Transportation', 'Business travel, fuel, and transportation costs', '#10B981', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (3, 'Meals & Entertainment', 'Business meals, client entertainment', '#F59E0B', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (4, 'Utilities', 'Electricity, water, internet, phone bills', '#EF4444', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (5, 'Marketing & Advertising', 'Marketing campaigns, advertising costs', '#8B5CF6', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (6, 'Professional Services', 'Legal, accounting, consulting fees', '#06B6D4', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (7, 'Equipment & Maintenance', 'Equipment purchase and maintenance', '#84CC16', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (8, 'Software & Subscriptions', 'Software licenses, subscriptions', '#F97316', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (9, 'Training & Development', 'Employee training, courses, certifications', '#EC4899', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');
INSERT INTO public.expense_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (10, 'Other', 'Miscellaneous expenses', '#6B7280', true, '2025-09-19 12:30:29.758151', '2025-09-19 12:30:29.758151');


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: origins; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (525, 'finance.payments.create', 'Create Payments', 'Create new payment records', 'Finance', 'create', 'payments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (526, 'finance.payments.read', 'View Payments', 'View payment records', 'Finance', 'read', 'payments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (527, 'finance.payments.update', 'Update Payments', 'Modify payment records', 'Finance', 'update', 'payments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (528, 'finance.payments.delete', 'Delete Payments', 'Delete payment records', 'Finance', 'delete', 'payments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (529, 'finance.payments.approve', 'Approve Payments', 'Approve payment transactions', 'Finance', 'approve', 'payments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (530, 'finance.invoices.create', 'Create Invoices', 'Create new invoice records', 'Finance', 'create', 'invoices', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (531, 'finance.invoices.read', 'View Invoices', 'View invoice records', 'Finance', 'read', 'invoices', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (532, 'finance.invoices.update', 'Update Invoices', 'Modify invoice records', 'Finance', 'update', 'invoices', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (533, 'finance.invoices.delete', 'Delete Invoices', 'Delete invoice records', 'Finance', 'delete', 'invoices', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (534, 'finance.expenses.create', 'Create Expenses', 'Create new expense records', 'Finance', 'create', 'expenses', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (535, 'finance.expenses.read', 'View Expenses', 'View expense records', 'Finance', 'read', 'expenses', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (536, 'finance.expenses.update', 'Update Expenses', 'Modify expense records', 'Finance', 'update', 'expenses', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (537, 'finance.expenses.delete', 'Delete Expenses', 'Delete expense records', 'Finance', 'delete', 'expenses', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (538, 'finance.expenses.approve', 'Approve Expenses', 'Approve expense claims', 'Finance', 'approve', 'expenses', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (539, 'purchase.orders.create', 'Create Purchase Orders', 'Create new purchase orders', 'Purchase', 'create', 'purchase_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (540, 'purchase.orders.read', 'View Purchase Orders', 'View purchase order records', 'Purchase', 'read', 'purchase_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (541, 'purchase.orders.update', 'Update Purchase Orders', 'Modify purchase orders', 'Purchase', 'update', 'purchase_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (542, 'purchase.orders.delete', 'Delete Purchase Orders', 'Delete purchase orders', 'Purchase', 'delete', 'purchase_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (543, 'purchase.orders.approve', 'Approve Purchase Orders', 'Approve purchase requests', 'Purchase', 'approve', 'purchase_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (544, 'purchase.suppliers.create', 'Create Suppliers', 'Add new supplier records', 'Purchase', 'create', 'suppliers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (545, 'purchase.suppliers.read', 'View Suppliers', 'View supplier information', 'Purchase', 'read', 'suppliers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (546, 'purchase.suppliers.update', 'Update Suppliers', 'Modify supplier records', 'Purchase', 'update', 'suppliers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (547, 'purchase.suppliers.delete', 'Delete Suppliers', 'Remove supplier records', 'Purchase', 'delete', 'suppliers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (548, 'inventory.products.create', 'Create Products', 'Add new product records', 'Inventory', 'create', 'products', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (549, 'inventory.products.read', 'View Products', 'View product information', 'Inventory', 'read', 'products', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (550, 'inventory.products.update', 'Update Products', 'Modify product records', 'Inventory', 'update', 'products', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (551, 'inventory.products.delete', 'Delete Products', 'Remove product records', 'Inventory', 'delete', 'products', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (552, 'inventory.adjustments.create', 'Create Stock Adjustments', 'Make inventory adjustments', 'Inventory', 'create', 'stock_adjustments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (553, 'inventory.adjustments.read', 'View Stock Adjustments', 'View adjustment history', 'Inventory', 'read', 'stock_adjustments', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (554, 'sales.orders.create', 'Create Sales Orders', 'Create new sales orders', 'Sales', 'create', 'sales_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (555, 'sales.orders.read', 'View Sales Orders', 'View sales order records', 'Sales', 'read', 'sales_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (556, 'sales.orders.update', 'Update Sales Orders', 'Modify sales orders', 'Sales', 'update', 'sales_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (557, 'sales.orders.delete', 'Delete Sales Orders', 'Delete sales orders', 'Sales', 'delete', 'sales_orders', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (558, 'sales.customers.create', 'Create Customers', 'Add new customer records', 'Sales', 'create', 'customers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (559, 'sales.customers.read', 'View Customers', 'View customer information', 'Sales', 'read', 'customers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (560, 'sales.customers.update', 'Update Customers', 'Modify customer records', 'Sales', 'update', 'customers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (561, 'sales.customers.delete', 'Delete Customers', 'Remove customer records', 'Sales', 'delete', 'customers', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (562, 'hr.users.create', 'Create Users', 'Add new user accounts', 'HR', 'create', 'users', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (563, 'hr.users.read', 'View Users', 'View user information', 'HR', 'read', 'users', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (564, 'hr.users.update', 'Update Users', 'Modify user accounts', 'HR', 'update', 'users', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (565, 'hr.users.delete', 'Delete Users', 'Remove user accounts', 'HR', 'delete', 'users', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (566, 'system.settings.read', 'View System Settings', 'View system configuration', 'System', 'read', 'settings', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (567, 'system.settings.update', 'Update System Settings', 'Modify system configuration', 'System', 'update', 'settings', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (568, 'system.reports.read', 'View Reports', 'Access system reports', 'System', 'read', 'reports', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (569, 'system.audit.read', 'View Audit Logs', 'Access audit and activity logs', 'System', 'read', 'audit_logs', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (1, 'users.create', 'Create Users', 'Create Users', 'User Management', 'create', 'users', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (2, 'users.read', 'View Users', 'View Users', 'User Management', 'read', 'users', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (10, 'users.update', 'Update Users', 'Update Users', 'User Management', 'update', 'users', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (11, 'users.delete', 'Delete Users', 'Delete Users', 'User Management', 'delete', 'users', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (12, 'users.activate', 'Activate/Deactivate Users', 'Activate/Deactivate Users', 'User Management', 'update', 'user_status', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (13, 'users.reset_password', 'Reset User Passwords', 'Reset User Passwords', 'User Management', 'update', 'user_passwords', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (14, 'roles.create', 'Create Roles', 'Create Roles', 'User Management', 'create', 'roles', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (70, 'sales_orders.approve', 'Approve Sales Orders', 'Approve Sales Orders', 'Sales', 'approve', 'sales_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (71, 'invoices.create', 'Create Invoices', 'Create Invoices', 'Sales', 'create', 'invoices', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (200, 'roles.manage', 'Manage Roles', 'Manage Roles', 'User Management', 'manage', 'roles', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (210, 'reports.financial', 'View Financial Reports', 'View Financial Reports', 'Finance', 'read', 'financial_reports', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (216, 'departments.manage', 'Manage Departments', 'Manage Departments', 'HR', 'manage', 'departments', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (224, 'sales.pricing', 'Manage Sales Pricing', 'Manage Sales Pricing', 'Sales', 'manage', 'pricing', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (225, 'reports.sales', 'View Sales Reports', 'View Sales Reports', 'Sales', 'read', 'sales_reports', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (239, 'stock.transfers', 'Manage Stock Transfers', 'Manage Stock Transfers', 'Inventory', 'manage', 'stock_transfers', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (240, 'categories.manage', 'Manage Categories', 'Manage Categories', 'Inventory', 'manage', 'categories', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (241, 'technicians.manage', 'Manage Technicians', 'Manage Technicians', 'Operations', 'manage', 'technicians', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (246, 'service_reports.submit', 'Submit Service Reports', 'Submit Service Reports', 'Operations', 'create', 'service_reports', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (250, 'feedback.manage', 'Manage Customer Feedback', 'Manage Customer Feedback', 'Customer Service', 'manage', 'feedback', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (251, 'call_logs.manage', 'Manage Call Logs', 'Manage Call Logs', 'Customer Service', 'manage', 'call_logs', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (254, 'communications.sms', 'Send SMS', 'Send SMS', 'Marketing', 'send', 'sms', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (255, 'communications.email', 'Send Email', 'Send Email', 'Marketing', 'send', 'email', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (256, 'communications.whatsapp', 'Send WhatsApp', 'Send WhatsApp', 'Marketing', 'send', 'whatsapp', '2025-09-22 22:51:30.995819+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (15, 'roles.read', 'View Roles', 'View Roles', 'User Management', 'read', 'roles', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (16, 'roles.update', 'Update Roles', 'Update Roles', 'User Management', 'update', 'roles', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (17, 'roles.delete', 'Delete Roles', 'Delete Roles', 'User Management', 'delete', 'roles', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (18, 'permissions.assign', 'Assign Permissions', 'Assign Permissions', 'User Management', 'assign', 'permissions', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (19, 'accounts.create', 'Create Chart of Accounts', 'Create Chart of Accounts', 'Finance', 'create', 'accounts', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (20, 'accounts.read', 'View Chart of Accounts', 'View Chart of Accounts', 'Finance', 'read', 'accounts', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (21, 'accounts.update', 'Update Chart of Accounts', 'Update Chart of Accounts', 'Finance', 'update', 'accounts', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (22, 'accounts.delete', 'Delete Chart of Accounts', 'Delete Chart of Accounts', 'Finance', 'delete', 'accounts', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (23, 'vouchers.create', 'Create Vouchers', 'Create Vouchers', 'Finance', 'create', 'vouchers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (24, 'vouchers.read', 'View Vouchers', 'View Vouchers', 'Finance', 'read', 'vouchers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (25, 'vouchers.update', 'Update Vouchers', 'Update Vouchers', 'Finance', 'update', 'vouchers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (26, 'vouchers.delete', 'Delete Vouchers', 'Delete Vouchers', 'Finance', 'delete', 'vouchers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (27, 'vouchers.approve', 'Approve Vouchers', 'Approve Vouchers', 'Finance', 'approve', 'vouchers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (28, 'vouchers.reject', 'Reject Vouchers', 'Reject Vouchers', 'Finance', 'reject', 'vouchers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (3, 'payments.create', 'Create Payments', 'Create Payments', 'Finance', 'create', 'payments', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (4, 'payments.read', 'View Payments', 'View Payments', 'Finance', 'read', 'payments', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (31, 'payments.update', 'Update Payments', 'Update Payments', 'Finance', 'update', 'payments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (32, 'payments.delete', 'Delete Payments', 'Delete Payments', 'Finance', 'delete', 'payments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (5, 'payments.approve', 'Approve Payments', 'Approve Payments', 'Finance', 'approve', 'payments', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (34, 'payments.reject', 'Reject Payments', 'Reject Payments', 'Finance', 'reject', 'payments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (35, 'expenses.create', 'Create Expenses', 'Create Expenses', 'Finance', 'create', 'expenses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (36, 'expenses.read', 'View Expenses', 'View Expenses', 'Finance', 'read', 'expenses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (37, 'expenses.update', 'Update Expenses', 'Update Expenses', 'Finance', 'update', 'expenses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (38, 'expenses.delete', 'Delete Expenses', 'Delete Expenses', 'Finance', 'delete', 'expenses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (39, 'expenses.approve', 'Approve Expenses', 'Approve Expenses', 'Finance', 'approve', 'expenses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (40, 'expenses.reject', 'Reject Expenses', 'Reject Expenses', 'Finance', 'reject', 'expenses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (299, 'cost_centers.manage', 'Manage Cost Centers', 'Manage Cost Centers', 'Finance', 'manage', 'cost_centers', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (41, 'budgets.create', 'Create Budgets', 'Create Budgets', 'Finance', 'create', 'budgets', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (301, 'budgets.read', 'View Budgets', 'View Budgets', 'Finance', 'read', 'budgets', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (302, 'budgets.update', 'Update Budgets', 'Update Budgets', 'Finance', 'update', 'budgets', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (303, 'budgets.approve', 'Approve Budgets', 'Approve Budgets', 'Finance', 'approve', 'budgets', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (42, 'financial_reports.view', 'View Financial Reports', 'View Financial Reports', 'Finance', 'read', 'financial_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (305, 'financial_reports.generate', 'Generate Financial Reports', 'Generate Financial Reports', 'Finance', 'create', 'financial_reports', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (306, 'financial_statements.view', 'View Financial Statements', 'View Financial Statements', 'Finance', 'read', 'financial_statements', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (43, 'ledger.view', 'View Ledger', 'View Ledger', 'Finance', 'read', 'ledger', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (308, 'trial_balance.view', 'View Trial Balance', 'View Trial Balance', 'Finance', 'read', 'trial_balance', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (44, 'employees.create', 'Create Employees', 'Create Employees', 'HR', 'create', 'employees', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (45, 'employees.read', 'View Employees', 'View Employees', 'HR', 'read', 'employees', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (46, 'employees.update', 'Update Employees', 'Update Employees', 'HR', 'update', 'employees', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (47, 'employees.delete', 'Delete Employees', 'Delete Employees', 'HR', 'delete', 'employees', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (313, 'employees.hire', 'Hire Employees', 'Hire Employees', 'HR', 'create', 'employee_hiring', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (314, 'employees.terminate', 'Terminate Employees', 'Terminate Employees', 'HR', 'update', 'employee_termination', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (48, 'departments.create', 'Create Departments', 'Create Departments', 'HR', 'create', 'departments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (49, 'departments.read', 'View Departments', 'View Departments', 'HR', 'read', 'departments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (50, 'departments.update', 'Update Departments', 'Update Departments', 'HR', 'update', 'departments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (318, 'departments.delete', 'Delete Departments', 'Delete Departments', 'HR', 'delete', 'departments', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (319, 'designations.create', 'Create Designations', 'Create Designations', 'HR', 'create', 'designations', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (320, 'designations.read', 'View Designations', 'View Designations', 'HR', 'read', 'designations', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (321, 'designations.update', 'Update Designations', 'Update Designations', 'HR', 'update', 'designations', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (322, 'designations.delete', 'Delete Designations', 'Delete Designations', 'HR', 'delete', 'designations', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (51, 'payroll.create', 'Create Payroll', 'Create Payroll', 'HR', 'create', 'payroll', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (52, 'payroll.read', 'View Payroll', 'View Payroll', 'HR', 'read', 'payroll', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (53, 'payroll.process', 'Process Payroll', 'Process Payroll', 'HR', 'process', 'payroll', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (54, 'payroll.approve', 'Approve Payroll', 'Approve Payroll', 'HR', 'approve', 'payroll', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (327, 'salary.update', 'Update Salaries', 'Update Salaries', 'HR', 'update', 'salaries', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (55, 'leave.create', 'Create Leave Requests', 'Create Leave Requests', 'HR', 'create', 'leave_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (56, 'leave.read', 'View Leave Requests', 'View Leave Requests', 'HR', 'read', 'leave_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (57, 'leave.approve', 'Approve Leave Requests', 'Approve Leave Requests', 'HR', 'approve', 'leave_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (331, 'leave.reject', 'Reject Leave Requests', 'Reject Leave Requests', 'HR', 'reject', 'leave_requests', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (332, 'attendance.mark', 'Mark Attendance', 'Mark Attendance', 'HR', 'create', 'attendance', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (333, 'attendance.view', 'View Attendance', 'View Attendance', 'HR', 'read', 'attendance', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (58, 'attendance.manage', 'Manage Attendance', 'Manage Attendance', 'HR', 'manage', 'attendance', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (59, 'customers.create', 'Create Customers', 'Create Customers', 'Sales', 'create', 'customers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (60, 'customers.read', 'View Customers', 'View Customers', 'Sales', 'read', 'customers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (61, 'customers.update', 'Update Customers', 'Update Customers', 'Sales', 'update', 'customers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (62, 'customers.delete', 'Delete Customers', 'Delete Customers', 'Sales', 'delete', 'customers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (339, 'customers.credit_limit', 'Manage Customer Credit Limits', 'Manage Customer Credit Limits', 'Sales', 'update', 'customer_credit', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (340, 'customer_groups.create', 'Create Customer Groups', 'Create Customer Groups', 'Sales', 'create', 'customer_groups', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (341, 'customer_groups.read', 'View Customer Groups', 'View Customer Groups', 'Sales', 'read', 'customer_groups', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (342, 'customer_groups.update', 'Update Customer Groups', 'Update Customer Groups', 'Sales', 'update', 'customer_groups', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (343, 'customer_groups.assign', 'Assign Customers to Groups', 'Assign Customers to Groups', 'Sales', 'assign', 'customer_groups', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (63, 'quotations.create', 'Create Quotations', 'Create Quotations', 'Sales', 'create', 'quotations', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (64, 'quotations.read', 'View Quotations', 'View Quotations', 'Sales', 'read', 'quotations', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (65, 'quotations.update', 'Update Quotations', 'Update Quotations', 'Sales', 'update', 'quotations', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (347, 'quotations.delete', 'Delete Quotations', 'Delete Quotations', 'Sales', 'delete', 'quotations', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (66, 'quotations.approve', 'Approve Quotations', 'Approve Quotations', 'Sales', 'approve', 'quotations', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (349, 'quotations.send', 'Send Quotations', 'Send Quotations', 'Sales', 'send', 'quotations', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (67, 'sales_orders.create', 'Create Sales Orders', 'Create Sales Orders', 'Sales', 'create', 'sales_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (68, 'sales_orders.read', 'View Sales Orders', 'View Sales Orders', 'Sales', 'read', 'sales_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (69, 'sales_orders.update', 'Update Sales Orders', 'Update Sales Orders', 'Sales', 'update', 'sales_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (353, 'sales_orders.delete', 'Delete Sales Orders', 'Delete Sales Orders', 'Sales', 'delete', 'sales_orders', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (355, 'sales_orders.cancel', 'Cancel Sales Orders', 'Cancel Sales Orders', 'Sales', 'update', 'sales_order_status', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (72, 'invoices.read', 'View Invoices', 'View Invoices', 'Sales', 'read', 'invoices', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (358, 'invoices.update', 'Update Invoices', 'Update Invoices', 'Sales', 'update', 'invoices', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (73, 'invoices.send', 'Send Invoices', 'Send Invoices', 'Sales', 'send', 'invoices', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (360, 'invoices.cancel', 'Cancel Invoices', 'Cancel Invoices', 'Sales', 'update', 'invoice_status', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (361, 'receipts.create', 'Create Receipt Vouchers', 'Create Receipt Vouchers', 'Sales', 'create', 'receipts', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (362, 'receipts.read', 'View Receipt Vouchers', 'View Receipt Vouchers', 'Sales', 'read', 'receipts', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (74, 'pricing.create', 'Create Price Configurations', 'Create Price Configurations', 'Sales', 'create', 'pricing', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (364, 'pricing.read', 'View Price Configurations', 'View Price Configurations', 'Sales', 'read', 'pricing', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (75, 'pricing.update', 'Update Price Configurations', 'Update Price Configurations', 'Sales', 'update', 'pricing', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (366, 'pricing.approve', 'Approve Price Changes', 'Approve Price Changes', 'Sales', 'approve', 'pricing', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (76, 'pos.access', 'Access POS System', 'Access POS System', 'Sales', 'read', 'pos', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (77, 'pos.transactions', 'Process POS Transactions', 'Process POS Transactions', 'Sales', 'create', 'pos_transactions', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (189, 'pos.refunds', 'Process POS Refunds', 'Process POS Refunds', 'Sales', 'create', 'pos_refunds', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (190, 'pos.discounts', 'Apply POS Discounts', 'Apply POS Discounts', 'Sales', 'apply', 'pos_discounts', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (191, 'pos.gifts', 'Process Gift Items in POS', 'Process Gift Items in POS', 'Sales', 'create', 'pos_gifts', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (192, 'pos_returns.create', 'Create POS Returns', 'Create POS Returns', 'Sales', 'create', 'pos_returns', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (193, 'pos_returns.read', 'View POS Returns', 'View POS Returns', 'Sales', 'read', 'pos_returns', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (194, 'pos_returns.approve', 'Approve POS Returns', 'Approve POS Returns', 'Sales', 'approve', 'pos_returns', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (195, 'pos_returns.complete', 'Complete POS Returns', 'Complete POS Returns', 'Sales', 'process', 'pos_returns', '2025-09-22 02:24:54.177336+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (78, 'sales_reports.view', 'View Sales Reports', 'View Sales Reports', 'Sales', 'read', 'sales_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (377, 'sales_reports.generate', 'Generate Sales Reports', 'Generate Sales Reports', 'Sales', 'create', 'sales_reports', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (79, 'suppliers.create', 'Create Suppliers', 'Create Suppliers', 'Purchase', 'create', 'suppliers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (80, 'suppliers.read', 'View Suppliers', 'View Suppliers', 'Purchase', 'read', 'suppliers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (81, 'suppliers.update', 'Update Suppliers', 'Update Suppliers', 'Purchase', 'update', 'suppliers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (82, 'suppliers.delete', 'Delete Suppliers', 'Delete Suppliers', 'Purchase', 'delete', 'suppliers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (382, 'suppliers.rating', 'Rate Suppliers', 'Rate Suppliers', 'Purchase', 'update', 'supplier_ratings', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (83, 'supplier_categories.create', 'Create Supplier Categories', 'Create Supplier Categories', 'Purchase', 'create', 'supplier_categories', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (384, 'supplier_categories.read', 'View Supplier Categories', 'View Supplier Categories', 'Purchase', 'read', 'supplier_categories', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (385, 'supplier_categories.update', 'Update Supplier Categories', 'Update Supplier Categories', 'Purchase', 'update', 'supplier_categories', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (386, 'supplier_categories.delete', 'Delete Supplier Categories', 'Delete Supplier Categories', 'Purchase', 'delete', 'supplier_categories', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (387, 'purchase_requests.create', 'Create Purchase Requests', 'Create Purchase Requests', 'Purchase', 'create', 'purchase_requests', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (388, 'purchase_requests.read', 'View Purchase Requests', 'View Purchase Requests', 'Purchase', 'read', 'purchase_requests', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (93, 'purchase_requests.approve', 'Approve Purchase Requests', 'Approve Purchase Requests', 'Purchase', 'approve', 'purchase_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (84, 'purchase_orders.create', 'Create Purchase Orders', 'Create Purchase Orders', 'Purchase', 'create', 'purchase_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (85, 'purchase_orders.read', 'View Purchase Orders', 'View Purchase Orders', 'Purchase', 'read', 'purchase_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (86, 'purchase_orders.update', 'Update Purchase Orders', 'Update Purchase Orders', 'Purchase', 'update', 'purchase_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (393, 'purchase_orders.delete', 'Delete Purchase Orders', 'Delete Purchase Orders', 'Purchase', 'delete', 'purchase_orders', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (87, 'purchase_orders.approve', 'Approve Purchase Orders', 'Approve Purchase Orders', 'Purchase', 'approve', 'purchase_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (395, 'purchase_orders.cancel', 'Cancel Purchase Orders', 'Cancel Purchase Orders', 'Purchase', 'update', 'purchase_order_status', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (88, 'goods_receipt.create', 'Create Goods Receipt', 'Create Goods Receipt', 'Purchase', 'create', 'goods_receipt', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (397, 'goods_receipt.read', 'View Goods Receipt', 'View Goods Receipt', 'Purchase', 'read', 'goods_receipt', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (89, 'supplier_invoices.create', 'Create Supplier Invoices', 'Create Supplier Invoices', 'Purchase', 'create', 'supplier_invoices', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (399, 'supplier_invoices.read', 'View Supplier Invoices', 'View Supplier Invoices', 'Purchase', 'read', 'supplier_invoices', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (400, 'supplier_invoices.update', 'Update Supplier Invoices', 'Update Supplier Invoices', 'Purchase', 'update', 'supplier_invoices', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (90, 'supplier_payments.create', 'Create Supplier Payments', 'Create Supplier Payments', 'Purchase', 'create', 'supplier_payments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (402, 'supplier_payments.read', 'View Supplier Payments', 'View Supplier Payments', 'Purchase', 'read', 'supplier_payments', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (91, 'supplier_payments.approve', 'Approve Supplier Payments', 'Approve Supplier Payments', 'Purchase', 'approve', 'supplier_payments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (92, 'purchase_reports.view', 'View Purchase Reports', 'View Purchase Reports', 'Purchase', 'read', 'purchase_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (405, 'purchase_reports.generate', 'Generate Purchase Reports', 'Generate Purchase Reports', 'Purchase', 'create', 'purchase_reports', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (94, 'products.create', 'Create Products', 'Create Products', 'Inventory', 'create', 'products', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (95, 'products.read', 'View Products', 'View Products', 'Inventory', 'read', 'products', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (96, 'products.update', 'Update Products', 'Update Products', 'Inventory', 'update', 'products', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (97, 'products.delete', 'Delete Products', 'Delete Products', 'Inventory', 'delete', 'products', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (410, 'products.price_update', 'Update Product Prices', 'Update Product Prices', 'Inventory', 'update', 'product_prices', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (98, 'categories.create', 'Create Product Categories', 'Create Product Categories', 'Inventory', 'create', 'categories', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (99, 'categories.read', 'View Product Categories', 'View Product Categories', 'Inventory', 'read', 'categories', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (100, 'categories.update', 'Update Product Categories', 'Update Product Categories', 'Inventory', 'update', 'categories', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (414, 'categories.delete', 'Delete Product Categories', 'Delete Product Categories', 'Inventory', 'delete', 'categories', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (101, 'brands.create', 'Create Brands', 'Create Brands', 'Inventory', 'create', 'brands', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (102, 'brands.read', 'View Brands', 'View Brands', 'Inventory', 'read', 'brands', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (103, 'brands.update', 'Update Brands', 'Update Brands', 'Inventory', 'update', 'brands', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (418, 'brands.delete', 'Delete Brands', 'Delete Brands', 'Inventory', 'delete', 'brands', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (181, 'origins.create', 'Create Origins', 'Create Origins', 'Inventory', 'create', 'origins', '2025-09-21 21:47:40.422614+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (182, 'origins.read', 'View Origins', 'View Origins', 'Inventory', 'read', 'origins', '2025-09-21 21:47:40.422614+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (183, 'origins.update', 'Update Origins', 'Update Origins', 'Inventory', 'update', 'origins', '2025-09-21 21:47:40.422614+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (184, 'origins.delete', 'Delete Origins', 'Delete Origins', 'Inventory', 'delete', 'origins', '2025-09-21 21:47:40.422614+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (104, 'inventory.track', 'Track Inventory', 'Track Inventory', 'Inventory', 'read', 'inventory', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (105, 'inventory.adjust', 'Adjust Inventory', 'Adjust Inventory', 'Inventory', 'create', 'inventory_adjustments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (106, 'inventory.approve_adjustments', 'Approve Inventory Adjustments', 'Approve Inventory Adjustments', 'Inventory', 'approve', 'inventory_adjustments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (426, 'inventory.reorder_levels', 'Set Reorder Levels', 'Set Reorder Levels', 'Inventory', 'update', 'reorder_levels', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (107, 'stock_transfers.create', 'Create Stock Transfers', 'Create Stock Transfers', 'Inventory', 'create', 'stock_transfers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (428, 'stock_transfers.read', 'View Stock Transfers', 'View Stock Transfers', 'Inventory', 'read', 'stock_transfers', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (108, 'stock_transfers.approve', 'Approve Stock Transfers', 'Approve Stock Transfers', 'Inventory', 'approve', 'stock_transfers', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (109, 'warehouses.create', 'Create Warehouses', 'Create Warehouses', 'Inventory', 'create', 'warehouses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (110, 'warehouses.read', 'View Warehouses', 'View Warehouses', 'Inventory', 'read', 'warehouses', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (432, 'warehouses.update', 'Update Warehouses', 'Update Warehouses', 'Inventory', 'update', 'warehouses', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (111, 'stock_counts.create', 'Create Stock Counts', 'Create Stock Counts', 'Inventory', 'create', 'stock_counts', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (434, 'stock_counts.read', 'View Stock Counts', 'View Stock Counts', 'Inventory', 'read', 'stock_counts', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (435, 'stock_counts.approve', 'Approve Stock Counts', 'Approve Stock Counts', 'Inventory', 'approve', 'stock_counts', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (112, 'inventory_reports.view', 'View Inventory Reports', 'View Inventory Reports', 'Inventory', 'read', 'inventory_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (437, 'inventory_reports.generate', 'Generate Inventory Reports', 'Generate Inventory Reports', 'Inventory', 'create', 'inventory_reports', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (113, 'stock_ledger.view', 'View Stock Ledger', 'View Stock Ledger', 'Inventory', 'read', 'stock_ledger', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (114, 'technicians.create', 'Create Technician Profiles', 'Create Technician Profiles', 'Operations', 'create', 'technicians', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (115, 'technicians.read', 'View Technician Profiles', 'View Technician Profiles', 'Operations', 'read', 'technicians', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (441, 'technicians.update', 'Update Technician Profiles', 'Update Technician Profiles', 'Operations', 'update', 'technicians', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (442, 'technicians.delete', 'Delete Technician Profiles', 'Delete Technician Profiles', 'Operations', 'delete', 'technicians', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (116, 'technicians.assign', 'Assign Technicians to Jobs', 'Assign Technicians to Jobs', 'Operations', 'assign', 'technicians', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (117, 'service_requests.create', 'Create Service Requests', 'Create Service Requests', 'Operations', 'create', 'service_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (118, 'service_requests.read', 'View Service Requests', 'View Service Requests', 'Operations', 'read', 'service_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (446, 'service_requests.update', 'Update Service Requests', 'Update Service Requests', 'Operations', 'update', 'service_requests', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (119, 'service_requests.assign', 'Assign Service Requests', 'Assign Service Requests', 'Operations', 'assign', 'service_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (448, 'service_requests.close', 'Close Service Requests', 'Close Service Requests', 'Operations', 'update', 'service_request_status', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (120, 'technician_inventory.view', 'View Technician Inventory', 'View Technician Inventory', 'Operations', 'read', 'technician_inventory', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (121, 'technician_inventory.manage', 'Manage Technician Inventory', 'Manage Technician Inventory', 'Operations', 'manage', 'technician_inventory', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (451, 'technician_inventory.requisition', 'Create Inventory Requisitions', 'Create Inventory Requisitions', 'Operations', 'create', 'inventory_requisitions', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (452, 'technician_inventory.approve_requisition', 'Approve Inventory Requisitions', 'Approve Inventory Requisitions', 'Operations', 'approve', 'inventory_requisitions', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (122, 'service_reports.create', 'Create Service Reports', 'Create Service Reports', 'Operations', 'create', 'service_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (123, 'service_reports.read', 'View Service Reports', 'View Service Reports', 'Operations', 'read', 'service_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (455, 'service_reports.approve', 'Approve Service Reports', 'Approve Service Reports', 'Operations', 'approve', 'service_reports', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (124, 'work_orders.create', 'Create Work Orders', 'Create Work Orders', 'Operations', 'create', 'work_orders', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (457, 'work_orders.read', 'View Work Orders', 'View Work Orders', 'Operations', 'read', 'work_orders', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (458, 'work_orders.update', 'Update Work Orders', 'Update Work Orders', 'Operations', 'update', 'work_orders', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (125, 'work_orders.complete', 'Complete Work Orders', 'Complete Work Orders', 'Operations', 'update', 'work_order_completion', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (126, 'complaints.create', 'Create Complaints', 'Create Complaints', 'Customer Service', 'create', 'complaints', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (127, 'complaints.read', 'View Complaints', 'View Complaints', 'Customer Service', 'read', 'complaints', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (128, 'complaints.update', 'Update Complaints', 'Update Complaints', 'Customer Service', 'update', 'complaints', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (129, 'complaints.assign', 'Assign Complaints', 'Assign Complaints', 'Customer Service', 'assign', 'complaints', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (130, 'complaints.resolve', 'Resolve Complaints', 'Resolve Complaints', 'Customer Service', 'resolve', 'complaints', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (131, 'complaints.escalate', 'Escalate Complaints', 'Escalate Complaints', 'Customer Service', 'update', 'complaint_escalation', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (466, 'complaints.close', 'Close Complaints', 'Close Complaints', 'Customer Service', 'update', 'complaint_closure', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (132, 'feedback.create', 'Create Customer Feedback', 'Create Customer Feedback', 'Customer Service', 'create', 'feedback', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (133, 'feedback.read', 'View Customer Feedback', 'View Customer Feedback', 'Customer Service', 'read', 'feedback', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (469, 'feedback.respond', 'Respond to Customer Feedback', 'Respond to Customer Feedback', 'Customer Service', 'create', 'feedback_responses', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (134, 'call_logs.create', 'Create Call Logs', 'Create Call Logs', 'Customer Service', 'create', 'call_logs', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (135, 'call_logs.read', 'View Call Logs', 'View Call Logs', 'Customer Service', 'read', 'call_logs', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (472, 'call_logs.update', 'Update Call Logs', 'Update Call Logs', 'Customer Service', 'update', 'call_logs', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (136, 'service_tracking.view', 'View Service Tracking', 'View Service Tracking', 'Customer Service', 'read', 'service_tracking', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (137, 'service_tracking.update', 'Update Service Tracking', 'Update Service Tracking', 'Customer Service', 'update', 'service_tracking', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (138, 'campaigns.create', 'Create Marketing Campaigns', 'Create Marketing Campaigns', 'Marketing', 'create', 'campaigns', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (139, 'campaigns.read', 'View Marketing Campaigns', 'View Marketing Campaigns', 'Marketing', 'read', 'campaigns', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (477, 'campaigns.update', 'Update Marketing Campaigns', 'Update Marketing Campaigns', 'Marketing', 'update', 'campaigns', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (478, 'campaigns.delete', 'Delete Marketing Campaigns', 'Delete Marketing Campaigns', 'Marketing', 'delete', 'campaigns', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (140, 'campaigns.execute', 'Execute Marketing Campaigns', 'Execute Marketing Campaigns', 'Marketing', 'execute', 'campaigns', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (141, 'sms.send', 'Send SMS Messages', 'Send SMS Messages', 'Marketing', 'send', 'sms', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (481, 'sms.read', 'View SMS History', 'View SMS History', 'Marketing', 'read', 'sms', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (142, 'sms.bulk_send', 'Send Bulk SMS', 'Send Bulk SMS', 'Marketing', 'send', 'bulk_sms', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (143, 'email.send', 'Send Email Messages', 'Send Email Messages', 'Marketing', 'send', 'email', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (484, 'email.read', 'View Email History', 'View Email History', 'Marketing', 'read', 'email', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (144, 'email.bulk_send', 'Send Bulk Email', 'Send Bulk Email', 'Marketing', 'send', 'bulk_email', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (145, 'whatsapp.send', 'Send WhatsApp Messages', 'Send WhatsApp Messages', 'Marketing', 'send', 'whatsapp', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (487, 'whatsapp.read', 'View WhatsApp History', 'View WhatsApp History', 'Marketing', 'read', 'whatsapp', '2025-09-22 22:51:31.348816+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (146, 'whatsapp.bulk_send', 'Send Bulk WhatsApp', 'Send Bulk WhatsApp', 'Marketing', 'send', 'bulk_whatsapp', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (147, 'customer_segments.create', 'Create Customer Segments', 'Create Customer Segments', 'Marketing', 'create', 'customer_segments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (148, 'customer_segments.read', 'View Customer Segments', 'View Customer Segments', 'Marketing', 'read', 'customer_segments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (149, 'customer_segments.update', 'Update Customer Segments', 'Update Customer Segments', 'Marketing', 'update', 'customer_segments', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (6, 'dashboard.executive', 'Access Executive Dashboard', 'Access Executive Dashboard', 'Dashboard', 'read', 'executive_dashboard', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (7, 'dashboard.departmental', 'Access Departmental Dashboard', 'Access Departmental Dashboard', 'Dashboard', 'read', 'departmental_dashboard', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (152, 'dashboard.operational', 'Access Operational Dashboard', 'Access Operational Dashboard', 'Dashboard', 'read', 'operational_dashboard', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (153, 'dashboard.kpi', 'View KPI Dashboard', 'View KPI Dashboard', 'Dashboard', 'read', 'kpi_dashboard', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (158, 'dashboard.customize', 'Customize Dashboard', 'Customize Dashboard', 'Dashboard', 'update', 'dashboard_customization', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (154, 'reports.generate', 'Generate Custom Reports', 'Generate Custom Reports', 'Reports', 'create', 'custom_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (155, 'reports.schedule', 'Schedule Reports', 'Schedule Reports', 'Reports', 'create', 'scheduled_reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (156, 'reports.export', 'Export Reports', 'Export Reports', 'Reports', 'export', 'reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (157, 'reports.share', 'Share Reports', 'Share Reports', 'Reports', 'share', 'reports', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (185, 'settings.read', 'View Settings', 'View Settings', 'System', 'read', 'settings', '2025-09-21 22:22:31.355982+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (186, 'settings.update', 'Update Settings', 'Update Settings', 'System', 'update', 'settings', '2025-09-21 22:22:31.355982+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (159, 'system.settings', 'Manage System Settings', 'Manage System Settings', 'System', 'manage', 'system_settings', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (160, 'system.backup', 'Manage System Backups', 'Manage System Backups', 'System', 'create', 'system_backups', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (168, 'system.restore', 'Restore System', 'Restore System', 'System', 'restore', 'system_restore', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (161, 'system.maintenance', 'System Maintenance Mode', 'System Maintenance Mode', 'System', 'manage', 'system_maintenance', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (162, 'audit.read', 'View Audit Logs', 'View Audit Logs', 'System', 'read', 'audit_logs', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (163, 'audit.export', 'Export Audit Logs', 'Export Audit Logs', 'System', 'export', 'audit_logs', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (164, 'api.access', 'API Access', 'API Access', 'System', 'read', 'api', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (165, 'api.manage', 'Manage API Keys', 'Manage API Keys', 'System', 'manage', 'api_keys', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (166, 'database.access', 'Database Access', 'Database Access', 'System', 'read', 'database', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (167, 'database.configure', 'Configure Database', 'Configure Database', 'System', 'manage', 'database_configuration', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (169, 'profile.read', 'View Own Profile', 'View Own Profile', 'Self Service', 'read', 'own_profile', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (170, 'profile.update', 'Update Own Profile', 'Update Own Profile', 'Self Service', 'update', 'own_profile', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (171, 'profile.change_password', 'Change Own Password', 'Change Own Password', 'Self Service', 'update', 'own_password', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (172, 'payslip.read', 'View Own Payslips', 'View Own Payslips', 'Self Service', 'read', 'own_payslips', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (173, 'payslip.download', 'Download Own Payslips', 'Download Own Payslips', 'Self Service', 'download', 'own_payslips', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (174, 'leave.request', 'Request Leave', 'Request Leave', 'Self Service', 'create', 'own_leave_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (175, 'leave.view_own', 'View Own Leave Requests', 'View Own Leave Requests', 'Self Service', 'read', 'own_leave_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (176, 'leave.cancel_own', 'Cancel Own Leave Requests', 'Cancel Own Leave Requests', 'Self Service', 'update', 'own_leave_requests', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (177, 'attendance.view_own', 'View Own Attendance', 'View Own Attendance', 'Self Service', 'read', 'own_attendance', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (178, 'attendance.mark_own', 'Mark Own Attendance', 'Mark Own Attendance', 'Self Service', 'create', 'own_attendance', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (179, 'documents.upload', 'Upload Personal Documents', 'Upload Personal Documents', 'Self Service', 'create', 'personal_documents', '2025-09-19 16:12:25.764658+06');
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) VALUES (180, 'documents.view_own', 'View Own Documents', 'View Own Documents', 'Self Service', 'read', 'personal_documents', '2025-09-19 16:12:25.764658+06');


--
-- Data for Name: pricing_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_order_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_order_timeline; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: return_inventory_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: return_refund_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: role_hierarchy; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (1, 1, 2, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (2, 2, 3, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (3, 2, 5, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (4, 2, 7, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (5, 2, 9, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (6, 2, 11, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (7, 3, 4, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (8, 7, 8, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (9, 9, 10, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (10, 11, 12, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (11, 13, 14, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (12, 15, 16, '2025-09-22 22:51:30.995819+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (19, 7, 15, '2025-09-22 23:24:39.181943+06');
INSERT INTO public.role_hierarchy (id, parent_role_id, child_role_id, created_at) VALUES (20, 7, 48, '2025-09-22 23:24:39.181943+06');


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1074, 1, 190, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1075, 1, 194, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1076, 1, 191, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1077, 1, 189, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1078, 1, 192, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1079, 1, 195, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1080, 1, 193, '2025-09-22 02:43:23.986097+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1085, 1, 200, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1095, 1, 210, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1101, 1, 216, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1109, 1, 224, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1110, 1, 225, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1124, 1, 239, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1125, 1, 240, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1126, 1, 241, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1131, 1, 246, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1135, 1, 250, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1136, 1, 251, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1139, 1, 254, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1140, 1, 255, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1141, 1, 256, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1152, 2, 210, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1153, 2, 225, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1175, 3, 210, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1184, 4, 210, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1191, 5, 216, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1207, 7, 224, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1208, 7, 225, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1216, 8, 225, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1237, 11, 239, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1238, 11, 240, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1243, 12, 239, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1245, 13, 241, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1252, 14, 246, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1253, 14, 121, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1259, 15, 251, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1264, 16, 251, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1267, 17, 250, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1273, 18, 254, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1274, 18, 255, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1275, 18, 256, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1279, 19, 210, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1280, 19, 225, '2025-09-22 22:51:30.995819+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1880, 7, 557, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1881, 7, 558, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1882, 7, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1883, 7, 560, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1884, 7, 561, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1885, 7, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1894, 7, 339, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1895, 7, 340, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1896, 7, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1897, 7, 342, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1898, 7, 343, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1902, 7, 347, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1904, 7, 349, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1908, 7, 353, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1909, 7, 355, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1911, 7, 358, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1913, 7, 360, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1914, 7, 361, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1915, 7, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1917, 7, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1919, 7, 366, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1930, 7, 377, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1932, 48, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1933, 48, 554, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1934, 48, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1935, 48, 556, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1936, 48, 558, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1937, 48, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1938, 48, 560, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1939, 48, 71, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1940, 48, 225, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1941, 48, 59, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1942, 48, 60, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1943, 48, 61, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1944, 48, 339, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1945, 48, 340, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1946, 48, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1947, 48, 342, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1948, 48, 63, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1949, 48, 64, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1950, 48, 65, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1951, 48, 67, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1952, 48, 68, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1953, 48, 69, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1954, 48, 355, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1955, 48, 72, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1956, 48, 358, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1957, 48, 360, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1958, 48, 361, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1959, 48, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1960, 48, 74, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1961, 48, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1962, 48, 75, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1963, 48, 76, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1964, 48, 77, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1965, 48, 189, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1966, 48, 191, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1967, 48, 192, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1968, 48, 193, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1969, 48, 78, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1970, 48, 377, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1971, 48, 95, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1972, 11, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1973, 11, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1974, 11, 548, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1975, 11, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1976, 11, 550, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1977, 11, 551, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1978, 11, 552, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1979, 11, 553, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1980, 11, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1981, 11, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1984, 11, 68, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1991, 11, 410, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1995, 11, 414, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1999, 11, 418, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2007, 11, 426, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2009, 11, 428, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2013, 11, 432, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2015, 11, 434, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2016, 11, 435, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2018, 11, 437, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2020, 12, 548, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2021, 12, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2022, 12, 550, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2023, 12, 552, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2024, 12, 553, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2025, 12, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2026, 12, 556, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2027, 12, 68, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2028, 12, 69, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2029, 12, 94, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2031, 12, 96, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2032, 12, 410, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2033, 12, 98, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2034, 12, 99, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2035, 12, 100, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2036, 12, 101, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2037, 12, 102, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2038, 12, 103, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2039, 12, 181, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2041, 12, 183, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2044, 12, 426, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2046, 12, 428, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2047, 12, 109, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2049, 12, 432, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1033, 11, 181, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1034, 11, 182, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1035, 11, 183, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1036, 11, 184, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1037, 12, 182, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1038, 10, 182, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1039, 9, 181, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1040, 9, 182, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1041, 9, 183, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1042, 8, 182, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1043, 7, 182, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1044, 7, 183, '2025-09-21 21:47:40.422614+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1287, 1, 525, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1288, 1, 526, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1289, 1, 527, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1290, 1, 528, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1291, 1, 529, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1292, 1, 530, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1293, 1, 531, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1294, 1, 532, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1295, 1, 533, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1296, 1, 534, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1297, 1, 535, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1298, 1, 536, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1299, 1, 537, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1300, 1, 538, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1301, 1, 539, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1302, 1, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1303, 1, 541, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1304, 1, 542, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1305, 1, 543, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1306, 1, 544, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1307, 1, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1308, 1, 546, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1309, 1, 547, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1310, 1, 548, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1311, 1, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1312, 1, 550, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1313, 1, 551, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1314, 1, 552, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1315, 1, 553, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1316, 1, 554, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1317, 1, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1318, 1, 556, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (181, 2, 2, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (182, 2, 15, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (183, 2, 20, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (184, 2, 24, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (185, 2, 27, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (186, 2, 4, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (187, 2, 5, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (188, 2, 36, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (189, 2, 39, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (190, 2, 41, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (191, 2, 42, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (192, 2, 43, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (193, 2, 45, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (194, 2, 49, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (195, 2, 52, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (196, 2, 54, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (197, 2, 56, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (198, 2, 57, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (199, 2, 60, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (200, 2, 64, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (201, 2, 66, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (202, 2, 68, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (203, 2, 70, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (204, 2, 72, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (205, 2, 74, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (206, 2, 75, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (207, 2, 78, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (208, 2, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (209, 2, 85, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (210, 2, 87, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (211, 2, 91, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (212, 2, 92, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (213, 2, 93, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (214, 2, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (215, 2, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (216, 2, 106, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (217, 2, 108, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (218, 2, 112, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (219, 2, 113, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (220, 2, 115, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (221, 2, 118, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (222, 2, 123, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (223, 2, 127, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (224, 2, 133, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (225, 2, 136, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (226, 2, 139, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (227, 2, 140, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (228, 2, 148, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (229, 2, 6, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (230, 2, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (231, 2, 153, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (232, 2, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (233, 2, 155, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (234, 2, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (235, 2, 157, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (236, 2, 162, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (237, 2, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (238, 2, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (239, 2, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (240, 2, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (241, 2, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (242, 2, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (243, 2, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (244, 2, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (245, 2, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (246, 2, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (247, 3, 2, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (248, 3, 19, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (249, 3, 20, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (250, 3, 21, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (251, 3, 22, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (252, 3, 23, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (253, 3, 24, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (254, 3, 25, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (255, 3, 26, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (256, 3, 27, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (257, 3, 28, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (258, 3, 3, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (259, 3, 4, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (260, 3, 31, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (261, 3, 32, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (262, 3, 5, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (263, 3, 34, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (264, 3, 35, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (265, 3, 36, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (266, 3, 37, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (267, 3, 38, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (268, 3, 39, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (269, 3, 40, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (270, 3, 41, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (271, 3, 42, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (272, 3, 43, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1319, 1, 557, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1320, 1, 558, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1321, 1, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1322, 1, 560, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1323, 1, 561, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (273, 3, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (274, 3, 90, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (275, 3, 91, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (276, 3, 60, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (277, 3, 72, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (278, 3, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (279, 3, 153, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (280, 3, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (281, 3, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (282, 3, 162, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (283, 3, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (284, 3, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (285, 3, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (286, 3, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (287, 3, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (288, 3, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (289, 3, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (290, 3, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (291, 3, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (292, 3, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (293, 4, 20, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (294, 4, 23, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (295, 4, 24, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (296, 4, 25, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (297, 4, 3, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (298, 4, 4, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (299, 4, 31, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (300, 4, 35, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (301, 4, 36, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (302, 4, 37, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (303, 4, 42, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (304, 4, 43, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (305, 4, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (306, 4, 60, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (307, 4, 72, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (308, 4, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (309, 4, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (310, 4, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (311, 4, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (312, 4, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (313, 4, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (314, 4, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (315, 4, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (316, 4, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (317, 4, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (318, 4, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (319, 4, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (320, 5, 1, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (321, 5, 2, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (322, 5, 10, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (323, 5, 12, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (324, 5, 13, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (325, 5, 44, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (326, 5, 45, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (327, 5, 46, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (328, 5, 47, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (329, 5, 48, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (330, 5, 49, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (331, 5, 50, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (332, 5, 51, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (333, 5, 52, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (334, 5, 53, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (335, 5, 54, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (336, 5, 55, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (337, 5, 56, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (338, 5, 57, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (339, 5, 58, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (340, 5, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (341, 5, 153, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (342, 5, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (343, 5, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (344, 5, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (345, 5, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (346, 5, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (347, 5, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (348, 5, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (349, 5, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (350, 5, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (351, 5, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (352, 5, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (353, 5, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (354, 7, 59, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (355, 7, 60, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (356, 7, 61, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (357, 7, 62, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (358, 7, 63, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (359, 7, 64, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (360, 7, 65, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (361, 7, 66, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (362, 7, 67, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (363, 7, 68, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (364, 7, 69, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (365, 7, 70, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (366, 7, 71, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (367, 7, 72, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (368, 7, 73, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (369, 7, 74, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (370, 7, 75, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (371, 7, 76, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (372, 7, 77, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (373, 7, 78, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (374, 7, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (375, 7, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (376, 7, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (377, 7, 153, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (378, 7, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (379, 7, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (380, 7, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (381, 7, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (382, 7, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (383, 7, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (384, 7, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (385, 7, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (386, 7, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (387, 7, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (388, 7, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (389, 7, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (390, 8, 59, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (391, 8, 60, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (392, 8, 61, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (393, 8, 63, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (394, 8, 64, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (395, 8, 65, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (396, 8, 67, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (397, 8, 68, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (398, 8, 69, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (399, 8, 71, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (400, 8, 72, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (401, 8, 73, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (402, 8, 76, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (403, 8, 77, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (404, 8, 78, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (405, 8, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (406, 8, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (407, 8, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (408, 8, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (409, 8, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (410, 8, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (411, 8, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (412, 8, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (413, 8, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (414, 8, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (415, 8, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (416, 8, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (417, 8, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (418, 8, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (419, 9, 79, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (420, 9, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (421, 9, 81, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (422, 9, 82, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (423, 9, 83, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (424, 9, 84, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (425, 9, 85, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (426, 9, 86, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (427, 9, 87, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (428, 9, 88, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (429, 9, 89, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (430, 9, 90, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (431, 9, 91, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (432, 9, 92, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (433, 9, 93, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (434, 9, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (435, 9, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (436, 9, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (437, 9, 153, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (438, 9, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (439, 9, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (440, 9, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (441, 9, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (442, 9, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (443, 9, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (444, 9, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (445, 9, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (446, 9, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (447, 9, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (448, 9, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (449, 9, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (450, 10, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (451, 10, 81, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (452, 10, 84, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (453, 10, 85, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (454, 10, 86, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (455, 10, 88, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (456, 10, 89, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (457, 10, 90, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (458, 10, 92, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (459, 10, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (460, 10, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (461, 10, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (462, 10, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (463, 10, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (464, 10, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (465, 10, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (466, 10, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (467, 10, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (468, 10, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (469, 10, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (470, 10, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (471, 10, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (472, 10, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (473, 11, 94, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (474, 11, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (475, 11, 96, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (476, 11, 97, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (477, 11, 98, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (478, 11, 99, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (479, 11, 100, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (480, 11, 101, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (481, 11, 102, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (482, 11, 103, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (483, 11, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (484, 11, 105, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (485, 11, 106, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (486, 11, 107, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (487, 11, 108, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (488, 11, 109, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (489, 11, 110, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (490, 11, 111, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (491, 11, 112, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (492, 11, 113, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (493, 11, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (494, 11, 85, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (495, 11, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (496, 11, 153, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (497, 11, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (498, 11, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (499, 11, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (500, 11, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (501, 11, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (502, 11, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (503, 11, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (504, 11, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (505, 11, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (506, 11, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (507, 11, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (508, 11, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (509, 12, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (510, 12, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (511, 12, 105, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (512, 12, 107, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (513, 12, 110, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (514, 12, 111, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (515, 12, 112, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (516, 12, 113, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (517, 12, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (518, 12, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (519, 12, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (520, 12, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (521, 12, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (522, 12, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (523, 12, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (524, 12, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (525, 12, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (526, 12, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (527, 12, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (528, 12, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (529, 6, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (530, 6, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (531, 6, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (532, 6, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (533, 6, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (534, 6, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (535, 6, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (536, 6, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (537, 6, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (538, 6, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (539, 6, 179, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (540, 6, 180, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (541, 19, 2, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (542, 19, 45, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (543, 19, 60, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (544, 19, 80, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (545, 19, 20, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (546, 19, 24, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (547, 19, 4, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (548, 19, 36, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (549, 19, 42, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (550, 19, 43, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (551, 19, 64, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (552, 19, 68, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (553, 19, 72, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (554, 19, 78, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (555, 19, 85, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (556, 19, 92, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (557, 19, 95, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (558, 19, 104, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (559, 19, 112, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (560, 19, 113, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (561, 19, 118, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (562, 19, 123, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (563, 19, 127, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (564, 19, 133, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (565, 19, 135, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (566, 19, 162, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (567, 19, 163, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (568, 19, 7, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (569, 19, 154, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (570, 19, 156, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (571, 19, 169, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (572, 19, 170, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (573, 19, 171, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (574, 19, 172, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (575, 19, 173, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (576, 19, 174, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (577, 19, 175, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (578, 19, 176, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (579, 19, 177, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (580, 19, 178, '2025-09-19 16:13:35.799339+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (581, 13, 114, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (582, 13, 115, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (583, 13, 116, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (584, 13, 117, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (585, 13, 118, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (586, 13, 119, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (587, 13, 120, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (588, 13, 121, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (589, 13, 122, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (590, 13, 123, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (591, 13, 124, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (592, 13, 125, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (593, 13, 7, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (594, 13, 154, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (595, 13, 169, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (596, 13, 170, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (597, 13, 171, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (598, 13, 172, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (599, 13, 174, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (600, 13, 175, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (601, 13, 177, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (602, 14, 118, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (603, 14, 122, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (604, 14, 120, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (605, 14, 125, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (606, 14, 169, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (607, 14, 170, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (608, 14, 171, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (609, 14, 172, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (610, 14, 174, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (611, 14, 175, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (612, 14, 177, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (613, 14, 178, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (614, 15, 126, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (615, 15, 127, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (616, 15, 128, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (617, 15, 129, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (618, 15, 130, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (619, 15, 132, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (620, 15, 133, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (621, 15, 134, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (622, 15, 135, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (623, 15, 136, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (624, 15, 137, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (625, 15, 117, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (626, 15, 60, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (627, 15, 7, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (628, 15, 154, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (629, 15, 169, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (630, 15, 170, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (631, 15, 171, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (632, 15, 172, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (633, 15, 174, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (634, 15, 175, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (635, 15, 177, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (636, 16, 126, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (637, 16, 127, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (638, 16, 128, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (639, 16, 132, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (640, 16, 134, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (641, 16, 135, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (642, 16, 117, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (643, 16, 60, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (644, 16, 169, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (645, 16, 170, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (646, 16, 171, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (647, 16, 172, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (648, 16, 174, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (649, 16, 175, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (650, 16, 177, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (651, 17, 132, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (652, 17, 133, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (653, 17, 127, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (654, 17, 60, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (655, 17, 136, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (656, 17, 7, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (657, 17, 154, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (658, 17, 169, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (659, 17, 170, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (660, 17, 171, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (661, 17, 172, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (662, 17, 174, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (663, 17, 175, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (664, 17, 177, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (665, 18, 138, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (666, 18, 139, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (667, 18, 140, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (668, 18, 141, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (669, 18, 142, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (670, 18, 143, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (671, 18, 144, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (672, 18, 145, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (673, 18, 146, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (674, 18, 147, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (675, 18, 148, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (676, 18, 149, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (677, 18, 60, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (678, 18, 7, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (679, 18, 154, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (680, 18, 169, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (681, 18, 170, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (682, 18, 171, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (683, 18, 172, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (684, 18, 174, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (685, 18, 175, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (686, 18, 177, '2025-09-19 16:14:48.893163+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1045, 1, 181, '2025-09-21 21:50:51.239266+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1046, 1, 184, '2025-09-21 21:50:51.239266+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1047, 1, 182, '2025-09-21 21:50:51.239266+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1048, 1, 183, '2025-09-21 21:50:51.239266+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1324, 1, 562, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1325, 1, 563, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1326, 1, 564, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1327, 1, 565, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1328, 1, 566, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1329, 1, 567, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1330, 1, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1331, 1, 569, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1381, 1, 299, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1383, 1, 301, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1384, 1, 302, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1385, 1, 303, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1387, 1, 305, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1388, 1, 306, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1390, 1, 308, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1395, 1, 313, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1396, 1, 314, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1400, 1, 318, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1401, 1, 319, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1402, 1, 320, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1403, 1, 321, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1404, 1, 322, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1409, 1, 327, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1413, 1, 331, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1414, 1, 332, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1415, 1, 333, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1421, 1, 339, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1422, 1, 340, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1423, 1, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1424, 1, 342, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1425, 1, 343, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1429, 1, 347, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1431, 1, 349, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1435, 1, 353, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1436, 1, 355, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1438, 1, 358, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1440, 1, 360, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1441, 1, 361, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1442, 1, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1444, 1, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1446, 1, 366, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1457, 1, 377, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1462, 1, 382, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1464, 1, 384, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1465, 1, 385, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1466, 1, 386, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1467, 1, 387, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1468, 1, 388, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1473, 1, 393, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1475, 1, 395, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1477, 1, 397, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1479, 1, 399, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1480, 1, 400, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1482, 1, 402, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1485, 1, 405, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1490, 1, 410, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1494, 1, 414, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1498, 1, 418, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1506, 1, 426, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1508, 1, 428, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1512, 1, 432, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1514, 1, 434, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1515, 1, 435, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1517, 1, 437, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1521, 1, 441, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1522, 1, 442, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1526, 1, 446, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1528, 1, 448, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1531, 1, 451, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1532, 1, 452, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1535, 1, 455, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1537, 1, 457, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1538, 1, 458, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1546, 1, 466, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1549, 1, 469, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1552, 1, 472, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1557, 1, 477, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1558, 1, 478, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1561, 1, 481, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1564, 1, 484, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1567, 1, 487, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1605, 2, 526, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1606, 2, 529, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1607, 2, 531, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1608, 2, 535, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1609, 2, 538, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1610, 2, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1611, 2, 543, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1612, 2, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1613, 2, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1614, 2, 553, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1615, 2, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1616, 2, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1617, 2, 563, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1618, 2, 566, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1619, 2, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1620, 2, 569, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1633, 2, 301, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1634, 2, 303, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1636, 2, 306, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1638, 2, 308, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1641, 2, 320, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1646, 2, 333, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1648, 2, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1653, 2, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1654, 2, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1655, 2, 366, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1656, 2, 76, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1657, 2, 193, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1658, 2, 194, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1661, 2, 384, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1662, 2, 388, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1666, 2, 397, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1667, 2, 399, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1668, 2, 402, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1672, 2, 99, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1673, 2, 102, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1674, 2, 182, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1677, 2, 428, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1679, 2, 110, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1680, 2, 434, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1681, 2, 435, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1686, 2, 120, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1687, 2, 452, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1689, 2, 455, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1690, 2, 457, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1693, 2, 135, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1696, 2, 481, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1697, 2, 484, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1698, 2, 487, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1702, 2, 152, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1706, 2, 164, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1707, 2, 166, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1712, 2, 180, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1713, 3, 525, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1714, 3, 526, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1715, 3, 527, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1716, 3, 528, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1717, 3, 529, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1718, 3, 530, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1719, 3, 531, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1720, 3, 532, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1721, 3, 533, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1722, 3, 534, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1723, 3, 535, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1049, 1, 185, '2025-09-21 22:22:31.355982+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1050, 1, 186, '2025-09-21 22:22:31.355982+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1051, 2, 185, '2025-09-21 22:22:31.355982+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1724, 3, 536, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1725, 3, 537, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1726, 3, 538, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1727, 3, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1728, 3, 543, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1729, 3, 566, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1730, 3, 567, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1731, 3, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1755, 3, 299, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1757, 3, 301, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1758, 3, 302, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1759, 3, 303, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1761, 3, 305, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1762, 3, 306, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1764, 3, 308, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1765, 3, 85, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1766, 3, 87, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1767, 3, 185, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1768, 3, 186, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1769, 4, 525, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1770, 4, 526, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1771, 4, 527, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1772, 4, 530, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1773, 4, 531, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1774, 4, 532, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1775, 4, 534, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1776, 4, 535, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1777, 4, 536, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1778, 4, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1779, 4, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1781, 4, 19, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1783, 4, 21, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1793, 4, 41, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1794, 4, 301, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1795, 4, 302, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1797, 4, 305, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1798, 4, 306, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1800, 4, 308, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1801, 4, 85, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (859, 1, 129, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (860, 1, 134, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (861, 1, 126, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (862, 1, 132, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (863, 1, 135, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (864, 1, 127, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (865, 1, 133, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (866, 1, 136, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (867, 1, 130, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (868, 1, 131, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (869, 1, 128, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (870, 1, 137, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (871, 1, 7, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (872, 1, 6, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (873, 1, 153, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (874, 1, 152, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (875, 1, 158, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (876, 1, 39, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (877, 1, 5, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (878, 1, 27, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (879, 1, 19, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (880, 1, 41, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (881, 1, 35, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (882, 1, 3, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (883, 1, 23, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (884, 1, 22, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (885, 1, 38, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (886, 1, 32, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (887, 1, 26, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (888, 1, 20, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (889, 1, 36, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (890, 1, 42, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (891, 1, 43, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (892, 1, 4, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (893, 1, 24, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (894, 1, 40, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (895, 1, 34, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (896, 1, 28, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (897, 1, 21, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (898, 1, 37, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (899, 1, 31, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (900, 1, 25, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (901, 1, 57, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (902, 1, 54, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (903, 1, 48, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (904, 1, 44, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (905, 1, 55, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (906, 1, 51, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (907, 1, 47, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (908, 1, 58, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (909, 1, 53, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (910, 1, 49, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (911, 1, 45, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (912, 1, 56, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (913, 1, 52, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (914, 1, 50, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (915, 1, 46, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (916, 1, 106, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (917, 1, 108, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (918, 1, 101, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (919, 1, 98, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (920, 1, 105, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (921, 1, 94, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (922, 1, 111, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (923, 1, 107, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (924, 1, 109, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (925, 1, 97, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (926, 1, 99, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (927, 1, 104, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (928, 1, 112, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (929, 1, 95, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (930, 1, 113, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (931, 1, 110, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (932, 1, 103, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (933, 1, 100, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (934, 1, 96, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (935, 1, 138, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (936, 1, 147, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (937, 1, 140, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (938, 1, 139, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (939, 1, 148, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (940, 1, 144, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (941, 1, 142, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (942, 1, 146, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (943, 1, 143, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (944, 1, 141, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (945, 1, 145, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (946, 1, 149, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (947, 1, 119, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (948, 1, 116, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (949, 1, 122, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (950, 1, 117, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (951, 1, 114, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (952, 1, 124, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1802, 9, 530, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1803, 9, 531, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1804, 9, 539, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1805, 9, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1806, 9, 541, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1807, 9, 542, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (953, 1, 121, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (954, 1, 123, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (955, 1, 118, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (956, 1, 120, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (957, 1, 115, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (958, 1, 125, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (959, 1, 87, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (960, 1, 93, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (961, 1, 91, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (962, 1, 88, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (963, 1, 84, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (964, 1, 83, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (965, 1, 89, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (966, 1, 90, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (967, 1, 79, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (968, 1, 82, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (969, 1, 85, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (970, 1, 92, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (971, 1, 80, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (972, 1, 86, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (973, 1, 81, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (974, 1, 154, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (975, 1, 155, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (976, 1, 156, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (977, 1, 157, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (978, 1, 66, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (979, 1, 70, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (980, 1, 59, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (981, 1, 71, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (982, 1, 77, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (983, 1, 74, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (984, 1, 63, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (985, 1, 67, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (986, 1, 62, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (987, 1, 60, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (988, 1, 72, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (989, 1, 76, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (990, 1, 64, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (991, 1, 68, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (992, 1, 78, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (993, 1, 73, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (994, 1, 61, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (995, 1, 75, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (996, 1, 65, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (997, 1, 69, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (998, 1, 178, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (999, 1, 174, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1000, 1, 179, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1001, 1, 173, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1002, 1, 177, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1003, 1, 175, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1004, 1, 172, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1005, 1, 169, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1006, 1, 180, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1007, 1, 176, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1008, 1, 171, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1009, 1, 170, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1010, 1, 160, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1011, 1, 163, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1012, 1, 165, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1013, 1, 167, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1014, 1, 161, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1015, 1, 159, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1016, 1, 164, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1017, 1, 162, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1018, 1, 166, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1019, 1, 168, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1020, 1, 18, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1021, 1, 14, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1022, 1, 1, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1023, 1, 17, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1024, 1, 11, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1025, 1, 15, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1026, 1, 2, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1027, 1, 16, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1028, 1, 13, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1029, 1, 10, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1030, 1, 12, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1031, 1, 102, '2025-09-20 21:11:15.654409+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1055, 7, 189, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1056, 7, 190, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1057, 7, 191, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1058, 7, 192, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1059, 7, 193, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1060, 7, 194, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1061, 7, 195, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1064, 8, 190, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1065, 8, 191, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1066, 8, 192, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1067, 8, 193, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1068, 15, 192, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1069, 15, 193, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1070, 15, 194, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1071, 17, 192, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1072, 17, 193, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1073, 3, 193, '2025-09-22 02:24:54.177336+06', 1);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1808, 9, 543, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1809, 9, 544, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1810, 9, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1811, 9, 546, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1812, 9, 547, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1813, 9, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1814, 9, 550, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1815, 9, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1820, 9, 382, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1822, 9, 384, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1823, 9, 385, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1824, 9, 386, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1825, 9, 387, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1826, 9, 388, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1831, 9, 393, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1833, 9, 395, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1835, 9, 397, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1837, 9, 399, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1838, 9, 400, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1840, 9, 402, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1843, 9, 405, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1845, 9, 96, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1846, 10, 539, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1847, 10, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1848, 10, 541, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1849, 10, 544, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1850, 10, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1851, 10, 546, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1852, 10, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1853, 10, 79, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1856, 10, 382, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1857, 10, 83, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1858, 10, 384, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1859, 10, 385, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1860, 10, 387, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1861, 10, 388, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1865, 10, 395, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1867, 10, 397, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1869, 10, 399, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1870, 10, 400, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1872, 10, 402, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1874, 10, 405, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1876, 7, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1877, 7, 554, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1878, 7, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (1879, 7, 556, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2051, 12, 434, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2053, 12, 437, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2055, 5, 562, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2056, 5, 563, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2057, 5, 564, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2058, 5, 565, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2059, 5, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2060, 5, 569, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2066, 5, 313, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2067, 5, 314, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2071, 5, 318, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2072, 5, 319, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2073, 5, 320, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2074, 5, 321, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2075, 5, 322, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2080, 5, 327, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2084, 5, 331, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2085, 5, 332, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2086, 5, 333, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2088, 5, 162, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2089, 15, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2090, 15, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2091, 15, 556, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2092, 15, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2093, 15, 560, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2094, 15, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2095, 15, 225, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2097, 15, 61, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2098, 15, 339, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2099, 15, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2100, 15, 342, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2101, 15, 64, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2102, 15, 65, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2103, 15, 68, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2104, 15, 69, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2105, 15, 355, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2106, 15, 72, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2107, 15, 358, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2108, 15, 360, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2109, 15, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2110, 15, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2111, 15, 75, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2112, 15, 76, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2114, 15, 78, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2115, 15, 95, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2116, 16, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2117, 16, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2118, 16, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2119, 16, 560, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2121, 16, 61, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2122, 16, 68, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2123, 16, 95, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2124, 6, 534, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2125, 6, 535, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2126, 6, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2127, 6, 35, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2128, 6, 36, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2129, 19, 526, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2130, 19, 531, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2131, 19, 535, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2132, 19, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2133, 19, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2134, 19, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2135, 19, 553, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2136, 19, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2137, 19, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2138, 19, 563, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2139, 19, 566, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2140, 19, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2141, 19, 569, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2145, 19, 15, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2150, 19, 301, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2152, 19, 306, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2154, 19, 308, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2156, 19, 49, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2157, 19, 320, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2158, 19, 52, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2159, 19, 56, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2160, 19, 333, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2162, 19, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2166, 19, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2167, 19, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2168, 19, 76, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2169, 19, 193, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2172, 19, 384, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2173, 19, 388, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2175, 19, 397, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2176, 19, 399, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2177, 19, 402, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2180, 19, 99, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2181, 19, 102, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2182, 19, 182, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2184, 19, 428, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2185, 19, 110, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2186, 19, 434, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2189, 19, 115, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2191, 19, 120, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2193, 19, 457, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2197, 19, 136, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2198, 19, 139, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2199, 19, 481, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2200, 19, 484, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2201, 19, 487, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2202, 19, 148, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2203, 19, 6, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2205, 19, 152, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2206, 19, 153, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2207, 19, 185, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2209, 19, 164, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2210, 19, 166, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2215, 19, 180, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2216, 54, 540, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2217, 54, 545, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2218, 54, 549, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2219, 54, 553, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2220, 54, 555, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2221, 54, 559, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2222, 54, 568, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2223, 54, 225, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2224, 54, 60, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2225, 54, 341, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2226, 54, 64, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2227, 54, 68, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2228, 54, 72, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2229, 54, 362, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2230, 54, 364, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2231, 54, 76, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2232, 54, 193, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2233, 54, 78, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2234, 54, 80, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2235, 54, 384, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2236, 54, 388, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2237, 54, 85, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2238, 54, 397, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2239, 54, 399, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2240, 54, 402, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2241, 54, 92, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2242, 54, 95, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2243, 54, 99, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2244, 54, 102, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2245, 54, 182, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2246, 54, 104, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2247, 54, 428, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2248, 54, 110, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2249, 54, 434, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2250, 54, 112, '2025-09-22 23:24:39.181943+06', NULL);
INSERT INTO public.role_permissions (id, role_id, permission_id, granted_at, granted_by) VALUES (2251, 54, 113, '2025-09-22 23:24:39.181943+06', NULL);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (2, 'executive', 'Executive/Management', 'High-level management with reporting access', 2, 'Management', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (3, 'finance_manager', 'Finance Manager', 'Finance department manager with approval rights', 3, 'Finance', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (4, 'finance_staff', 'Finance Staff', 'Junior accountants with limited access', 4, 'Finance', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (5, 'hr_manager', 'HR Manager', 'Human resources management', 3, 'HR', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (6, 'employee', 'Employee', 'Employee self-service access', 6, 'General', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (7, 'sales_manager', 'Sales Manager', 'Sales department manager with approval rights', 3, 'Sales', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (8, 'sales_executive', 'Sales Executive', 'Sales staff with order management', 4, 'Sales', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (9, 'purchase_manager', 'Purchase Manager', 'Purchase department manager with approval rights', 3, 'Purchase', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (10, 'purchase_staff', 'Purchase Staff', 'Purchase staff with order creation', 4, 'Purchase', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (11, 'inventory_manager', 'Inventory Manager', 'Warehouse and inventory management', 3, 'Inventory', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (12, 'warehouse_staff', 'Warehouse Staff', 'Warehouse operations staff', 5, 'Inventory', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (13, 'technician_supervisor', 'Technician Supervisor', 'Field technician management', 4, 'Operations', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (14, 'technician', 'Technician', 'Field service technician', 5, 'Operations', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (15, 'call_center_manager', 'Call Center Manager', 'Customer service management', 4, 'Customer Service', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (16, 'call_center_operator', 'Call Center Operator', 'Customer service representative', 5, 'Customer Service', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (17, 'customer_service', 'Customer Service', 'Customer feedback and service management', 5, 'Customer Service', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (18, 'marketing', 'Marketing', 'Marketing and communication', 4, 'Marketing', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (19, 'auditor', 'Auditor', 'Read-only audit access', 3, 'Compliance', true, '2025-09-19 16:01:58.951041+06', '2025-09-19 16:01:58.951041+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (1, 'system_admin', 'System Administrator', 'Full system access', 1, 'IT', true, '2025-09-19 16:01:58.951041+06', '2025-09-20 21:11:15.654409+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (48, 'sales_staff', 'Sales Staff', 'Sales representatives', 4, 'Sales', true, '2025-09-22 23:24:39.16824+06', '2025-09-22 23:24:39.16824+06');
INSERT INTO public.roles (id, name, display_name, description, level, department, is_active, created_at, updated_at) VALUES (54, 'viewer', 'Viewer', 'Read-only access to reports and basic data', 8, 'General', true, '2025-09-22 23:24:39.16824+06', '2025-09-22 23:24:39.16824+06');


--
-- Data for Name: sales_order_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_return_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (4, 'company', 'phone', '+880 1234 567890', 'string', NULL, false, '2025-09-21 22:16:17.251216+06', '2025-09-21 22:24:12.288476+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (7, 'system', 'timezone', 'bdt', 'string', NULL, false, '2025-09-21 22:16:17.270714+06', '2025-09-21 22:24:12.306565+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (5, 'company', 'tax_id', 'VAT-123456789', 'string', NULL, false, '2025-09-21 22:16:17.258059+06', '2025-09-21 22:24:12.288476+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (10, 'notifications', 'low_stock_alerts', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.294355+06', '2025-09-21 22:17:35.125221+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (11, 'notifications', 'purchase_order_approvals', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.299403+06', '2025-09-21 22:17:35.147385+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (12, 'notifications', 'payment_due_reminders', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.30457+06', '2025-09-21 22:17:35.166738+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (13, 'notifications', 'supplier_performance', 'false', 'boolean', NULL, false, '2025-09-21 22:16:17.310119+06', '2025-09-21 22:17:35.195697+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (14, 'notifications', 'system_updates', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.315054+06', '2025-09-21 22:17:35.209616+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (15, 'notifications', 'security_alerts', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.321253+06', '2025-09-21 22:17:35.21544+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (16, 'notifications', 'notification_emails', 'manager@company.com, finance@company.com', 'string', NULL, false, '2025-09-21 22:16:17.326084+06', '2025-09-21 22:17:35.237415+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (17, 'security', 'require_2fa', 'false', 'boolean', NULL, false, '2025-09-21 22:16:17.330857+06', '2025-09-21 22:17:35.251612+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (18, 'security', 'session_timeout', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.334999+06', '2025-09-21 22:17:35.259535+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (19, 'security', 'session_duration', '60', 'number', NULL, false, '2025-09-21 22:16:17.340847+06', '2025-09-21 22:17:35.265152+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (20, 'security', 'allow_user_registration', 'false', 'boolean', NULL, false, '2025-09-21 22:16:17.35097+06', '2025-09-21 22:17:35.270334+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (21, 'security', 'email_verification_required', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.355077+06', '2025-09-21 22:17:35.275767+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (22, 'security', 'default_user_role', 'viewer', 'string', NULL, false, '2025-09-21 22:16:17.358324+06', '2025-09-21 22:17:35.281624+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (23, 'integrations', 'email_service_connected', 'true', 'boolean', NULL, false, '2025-09-21 22:16:17.362298+06', '2025-09-21 22:17:35.286781+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (24, 'integrations', 'accounting_software_connected', 'false', 'boolean', NULL, false, '2025-09-21 22:16:17.368313+06', '2025-09-21 22:17:35.292846+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (25, 'integrations', 'erp_system_connected', 'false', 'boolean', NULL, false, '2025-09-21 22:16:17.373631+06', '2025-09-21 22:17:35.299944+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (26, 'integrations', 'api_access_enabled', 'false', 'boolean', NULL, false, '2025-09-21 22:16:17.37986+06', '2025-09-21 22:17:35.305976+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (27, 'integrations', 'api_key', 'sk_test_...', 'string', NULL, false, '2025-09-21 22:16:17.391077+06', '2025-09-21 22:17:35.310542+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (28, 'integrations', 'webhook_url', '', 'string', NULL, false, '2025-09-21 22:16:17.398191+06', '2025-09-21 22:17:35.315167+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (3, 'company', 'company_address', 'Dhaka, Bangladesh', 'string', NULL, false, '2025-09-21 22:16:17.244452+06', '2025-09-21 22:24:12.288476+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (8, 'system', 'date_format', 'dd/mm/yyyy', 'string', NULL, false, '2025-09-21 22:16:17.2815+06', '2025-09-21 22:24:12.306565+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (2, 'company', 'company_email', 'admin@company.com', 'string', NULL, false, '2025-09-21 22:16:17.23859+06', '2025-09-21 22:24:12.288476+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (6, 'system', 'default_currency', 'bdt', 'string', NULL, false, '2025-09-21 22:16:17.263448+06', '2025-09-21 22:24:12.306565+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (1, 'company', 'company_name', 'Company Name', 'string', NULL, false, '2025-09-21 22:16:17.229391+06', '2025-09-21 22:24:12.288476+06');
INSERT INTO public.settings (id, category, key, value, data_type, description, is_public, created_at, updated_at) VALUES (9, 'system', 'number_format', 'bd', 'string', NULL, false, '2025-09-21 22:16:17.288099+06', '2025-09-21 22:24:12.306565+06');


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: supplier_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (1, 'Electronics', 'Electronic components and devices', '#3B82F6', true, '2025-09-19 12:30:29.664137+06', '2025-09-19 12:30:29.664137+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (2, 'Raw Materials', 'Basic materials used in production', '#10B981', true, '2025-09-19 12:30:29.665321+06', '2025-09-19 12:30:29.665321+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (3, 'Furniture', 'Office and industrial furniture', '#F59E0B', true, '2025-09-19 12:30:29.666092+06', '2025-09-19 12:30:29.666092+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (4, 'Components', 'Mechanical and electrical components', '#EF4444', true, '2025-09-19 12:30:29.666948+06', '2025-09-19 12:30:29.666948+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (5, 'Textiles', 'Fabric and textile materials', '#8B5CF6', true, '2025-09-19 12:30:29.66842+06', '2025-09-19 12:30:29.66842+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (6, 'Food & Beverage', 'Food and beverage products', '#06B6D4', true, '2025-09-19 12:30:29.669324+06', '2025-09-19 12:30:29.669324+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (7, 'Industrial Equipment', 'Heavy machinery and equipment', '#84CC16', true, '2025-09-19 12:30:29.670284+06', '2025-09-19 12:30:29.670284+06');
INSERT INTO public.supplier_categories (id, name, description, color, is_active, created_at, updated_at) VALUES (8, 'Office Supplies', 'Office and stationery supplies', '#F97316', true, '2025-09-19 12:30:29.671351+06', '2025-09-19 12:30:29.671351+06');


--
-- Data for Name: supplier_performance; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, username, email, password_hash, full_name, mobile_number, departments, role, is_active, last_login, password_reset_token, password_reset_expires, email_verification_token, email_verified, created_at, updated_at, role_id) VALUES (1, 'admin', 'admin@erp.com', '$2b$10$u/u8cVp4HinO2PBh5MsI/eXdMyrlDK0aBOa797gWUm55SDixnNZEi', 'System Administrator', NULL, NULL, 'admin', true, '2025-09-22 02:16:04.496577+06', NULL, NULL, NULL, true, '2025-09-19 12:30:45.029941+06', '2025-09-19 12:30:45.029941+06', 1);


--
-- Name: approval_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_history_id_seq', 1, false);


--
-- Name: audit_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_settings_id_seq', 17, true);


--
-- Name: brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.brands_id_seq', 6, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 2, true);


--
-- Name: customer_code_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_code_seq', 1, true);


--
-- Name: customer_due_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_due_transactions_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, true);


--
-- Name: data_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.data_changes_id_seq', 1, false);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 70, true);


--
-- Name: expense_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_number_seq', 4, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 4, true);


--
-- Name: invoice_number_sequence; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_number_sequence', 3, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 3, true);


--
-- Name: origins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.origins_id_seq', 3, true);


--
-- Name: payment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_history_id_seq', 12, true);


--
-- Name: payment_number_sequence; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_number_sequence', 14, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 12, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 569, true);


--
-- Name: po_number_sequence; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.po_number_sequence', 11, true);


--
-- Name: pricing_rule_code_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pricing_rule_code_seq', 1, false);


--
-- Name: pricing_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pricing_rules_id_seq', 1, false);


--
-- Name: product_code_sequence; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_code_sequence', 5, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 4, true);


--
-- Name: purchase_order_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_order_line_items_id_seq', 11, true);


--
-- Name: purchase_order_timeline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_order_timeline_id_seq', 25, true);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 11, true);


--
-- Name: return_inventory_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.return_inventory_adjustments_id_seq', 9, true);


--
-- Name: return_refund_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.return_refund_transactions_id_seq', 1, false);


--
-- Name: role_hierarchy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_hierarchy_id_seq', 24, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 2251, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 54, true);


--
-- Name: sales_order_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_order_line_items_id_seq', 17, true);


--
-- Name: sales_order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_order_number_seq', 6, false);


--
-- Name: sales_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_orders_id_seq', 6, true);


--
-- Name: sales_receipt_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_receipt_number_seq', 1, false);


--
-- Name: sales_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_receipts_id_seq', 1, false);


--
-- Name: sales_return_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_return_items_id_seq', 17, true);


--
-- Name: sales_return_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_return_number_seq', 1000, true);


--
-- Name: sales_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_returns_id_seq', 12, true);


--
-- Name: security_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.security_events_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 158, true);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_adjustments_id_seq', 4, true);


--
-- Name: subcategories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subcategories_id_seq', 4, true);


--
-- Name: supplier_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_categories_id_seq', 16, true);


--
-- Name: supplier_code_suppliers; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_code_suppliers', 3, true);


--
-- Name: supplier_performance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_performance_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 3, true);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_activity_logs_id_seq', 98, true);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_permissions_id_seq', 1, false);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: approval_history approval_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_pkey PRIMARY KEY (id);


--
-- Name: audit_settings audit_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_settings
    ADD CONSTRAINT audit_settings_pkey PRIMARY KEY (id);


--
-- Name: audit_settings audit_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_settings
    ADD CONSTRAINT audit_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customer_due_transactions customer_due_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_due_transactions
    ADD CONSTRAINT customer_due_transactions_pkey PRIMARY KEY (id);


--
-- Name: customers customers_customer_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: data_changes data_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_changes
    ADD CONSTRAINT data_changes_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: origins origins_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.origins
    ADD CONSTRAINT origins_name_key UNIQUE (name);


--
-- Name: origins origins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.origins
    ADD CONSTRAINT origins_pkey PRIMARY KEY (id);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- Name: payments payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_number_key UNIQUE (payment_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: products products_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_barcode_key UNIQUE (barcode);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_product_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_code_key UNIQUE (product_code);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: purchase_order_line_items purchase_order_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_line_items
    ADD CONSTRAINT purchase_order_line_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_timeline purchase_order_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_timeline
    ADD CONSTRAINT purchase_order_timeline_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: return_inventory_adjustments return_inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_inventory_adjustments
    ADD CONSTRAINT return_inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: return_refund_transactions return_refund_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_refund_transactions
    ADD CONSTRAINT return_refund_transactions_pkey PRIMARY KEY (id);


--
-- Name: role_hierarchy role_hierarchy_parent_role_id_child_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_child_role_id_key UNIQUE (parent_role_id, child_role_id);


--
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_order_line_items sales_order_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_line_items
    ADD CONSTRAINT sales_order_line_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_order_number_key UNIQUE (order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_receipts sales_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_receipts
    ADD CONSTRAINT sales_receipts_pkey PRIMARY KEY (id);


--
-- Name: sales_receipts sales_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_receipts
    ADD CONSTRAINT sales_receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: sales_return_items sales_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_return_number_key UNIQUE (return_number);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: settings settings_category_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_category_key_key UNIQUE (category, key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_name_category_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_name_category_id_key UNIQUE (name, category_id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: supplier_categories supplier_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_categories
    ADD CONSTRAINT supplier_categories_name_key UNIQUE (name);


--
-- Name: supplier_categories supplier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_categories
    ADD CONSTRAINT supplier_categories_pkey PRIMARY KEY (id);


--
-- Name: supplier_performance supplier_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_performance
    ADD CONSTRAINT supplier_performance_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);





--
-- Name: idx_approval_history_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_history_entity ON public.approval_history USING btree (entity_type, entity_id);


--
-- Name: idx_approval_history_performed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_history_performed_by ON public.approval_history USING btree (performed_by);


--
-- Name: idx_brands_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brands_created_at ON public.brands USING btree (created_at);


--
-- Name: idx_brands_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brands_is_active ON public.brands USING btree (is_active);


--
-- Name: idx_brands_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_brands_name ON public.brands USING btree (name);


--
-- Name: idx_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_name ON public.categories USING btree (name);


--
-- Name: idx_customer_due_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_due_transactions_created_at ON public.customer_due_transactions USING btree (created_at);


--
-- Name: idx_customer_due_transactions_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_due_transactions_customer_id ON public.customer_due_transactions USING btree (customer_id);


--
-- Name: idx_customer_due_transactions_sales_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_due_transactions_sales_order_id ON public.customer_due_transactions USING btree (sales_order_id);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_customers_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_type ON public.customers USING btree (customer_type);


--
-- Name: idx_data_changes_activity_log; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_changes_activity_log ON public.data_changes USING btree (activity_log_id);


--
-- Name: idx_data_changes_activity_log_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_changes_activity_log_id ON public.data_changes USING btree (activity_log_id);


--
-- Name: idx_data_changes_field; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_changes_field ON public.data_changes USING btree (field_name);


--
-- Name: idx_data_changes_field_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_changes_field_name ON public.data_changes USING btree (field_name);


--
-- Name: idx_data_changes_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_changes_table_record ON public.data_changes USING btree (table_name, record_id);


--
-- Name: idx_expense_categories_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expense_categories_is_active ON public.expense_categories USING btree (is_active);


--
-- Name: idx_expense_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expense_categories_name ON public.expense_categories USING btree (name);


--
-- Name: idx_expenses_approval_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_approval_status ON public.expenses USING btree (approval_status);


--
-- Name: idx_expenses_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category_id ON public.expenses USING btree (category_id);


--
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- Name: idx_expenses_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_department ON public.expenses USING btree (department);


--
-- Name: idx_expenses_expense_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_expense_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_expense_number ON public.expenses USING btree (expense_number);


--
-- Name: idx_expenses_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_project ON public.expenses USING btree (project);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_expenses_vendor_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_vendor_name ON public.expenses USING btree (vendor_name);


--
-- Name: idx_invoices_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);


--
-- Name: idx_invoices_purchase_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_purchase_order_id ON public.invoices USING btree (purchase_order_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_supplier_id ON public.invoices USING btree (supplier_id);


--
-- Name: idx_origins_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_origins_created_at ON public.origins USING btree (created_at);


--
-- Name: idx_origins_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_origins_name ON public.origins USING btree (name);


--
-- Name: idx_origins_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_origins_status ON public.origins USING btree (status);


--
-- Name: idx_payment_history_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_invoice_id ON public.payment_history USING btree (invoice_id);


--
-- Name: idx_payment_history_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_payment_id ON public.payment_history USING btree (payment_id);


--
-- Name: idx_payments_approval_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_approval_status ON public.payments USING btree (approval_status);


--
-- Name: idx_payments_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id);


--
-- Name: idx_payments_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_supplier_id ON public.payments USING btree (supplier_id);


--
-- Name: idx_permissions_module; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_permissions_module ON public.permissions USING btree (module);


--
-- Name: idx_pricing_rules_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_rules_category_id ON public.pricing_rules USING btree (category_id);


--
-- Name: idx_pricing_rules_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_rules_dates ON public.pricing_rules USING btree (start_date, end_date);


--
-- Name: idx_pricing_rules_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_rules_is_active ON public.pricing_rules USING btree (is_active);


--
-- Name: idx_pricing_rules_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_rules_product_id ON public.pricing_rules USING btree (product_id);


--
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);


--
-- Name: idx_products_brand_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_brand_id ON public.products USING btree (brand_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_name ON public.products USING btree (name);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_products_stock_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_stock_status ON public.products USING btree (current_stock, min_stock_level);


--
-- Name: idx_products_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_subcategory_id ON public.products USING btree (subcategory_id);


--
-- Name: idx_products_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_supplier_id ON public.products USING btree (supplier_id);


--
-- Name: idx_purchase_order_line_items_po_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_order_line_items_po_id ON public.purchase_order_line_items USING btree (purchase_order_id);


--
-- Name: idx_purchase_order_line_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_order_line_items_product_id ON public.purchase_order_line_items USING btree (product_id);


--
-- Name: idx_purchase_order_timeline_po_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_order_timeline_po_id ON public.purchase_order_timeline USING btree (purchase_order_id);


--
-- Name: idx_purchase_orders_approval_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_approval_status ON public.purchase_orders USING btree (approval_status);


--
-- Name: idx_purchase_orders_expected_delivery; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_expected_delivery ON public.purchase_orders USING btree (expected_delivery_date);


--
-- Name: idx_purchase_orders_order_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_order_date ON public.purchase_orders USING btree (order_date);


--
-- Name: idx_purchase_orders_po_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_po_number ON public.purchase_orders USING btree (po_number);


--
-- Name: idx_purchase_orders_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_priority ON public.purchase_orders USING btree (priority);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_purchase_orders_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_return_inventory_adjustments_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_return_inventory_adjustments_product_id ON public.return_inventory_adjustments USING btree (product_id);


--
-- Name: idx_return_inventory_adjustments_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_return_inventory_adjustments_return_id ON public.return_inventory_adjustments USING btree (return_id);


--
-- Name: idx_return_refund_transactions_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_return_refund_transactions_return_id ON public.return_refund_transactions USING btree (return_id);


--
-- Name: idx_return_refund_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_return_refund_transactions_status ON public.return_refund_transactions USING btree (transaction_status);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roles_department ON public.roles USING btree (department);


--
-- Name: idx_sales_order_line_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_order_line_items_product_id ON public.sales_order_line_items USING btree (product_id);


--
-- Name: idx_sales_order_line_items_sales_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_order_line_items_sales_order_id ON public.sales_order_line_items USING btree (sales_order_id);


--
-- Name: idx_sales_orders_cashier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_orders_cashier_id ON public.sales_orders USING btree (cashier_id);


--
-- Name: idx_sales_orders_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_orders_customer_id ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_order_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_orders_order_date ON public.sales_orders USING btree (order_date);


--
-- Name: idx_sales_orders_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_orders_payment_status ON public.sales_orders USING btree (payment_status);


--
-- Name: idx_sales_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (status);


--
-- Name: idx_sales_receipts_cashier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_receipts_cashier_id ON public.sales_receipts USING btree (cashier_id);


--
-- Name: idx_sales_receipts_receipt_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_receipts_receipt_date ON public.sales_receipts USING btree (receipt_date);


--
-- Name: idx_sales_receipts_sales_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_receipts_sales_order_id ON public.sales_receipts USING btree (sales_order_id);


--
-- Name: idx_sales_return_items_original_line_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_return_items_original_line_item_id ON public.sales_return_items USING btree (original_line_item_id);


--
-- Name: idx_sales_return_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_return_items_product_id ON public.sales_return_items USING btree (product_id);


--
-- Name: idx_sales_return_items_return_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_return_items_return_id ON public.sales_return_items USING btree (return_id);


--
-- Name: idx_sales_returns_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_customer_id ON public.sales_returns USING btree (customer_id);


--
-- Name: idx_sales_returns_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_date ON public.sales_returns USING btree (return_date);


--
-- Name: idx_sales_returns_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_order_id ON public.sales_returns USING btree (original_order_id);


--
-- Name: idx_sales_returns_original_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_original_order_id ON public.sales_returns USING btree (original_order_id);


--
-- Name: idx_sales_returns_processed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_processed_by ON public.sales_returns USING btree (processed_by);


--
-- Name: idx_sales_returns_return_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_return_date ON public.sales_returns USING btree (return_date);


--
-- Name: idx_sales_returns_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_returns_status ON public.sales_returns USING btree (return_status);


--
-- Name: idx_security_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at);


--
-- Name: idx_security_events_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_resolved ON public.security_events USING btree (resolved);


--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);


--
-- Name: idx_security_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: idx_settings_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_settings_category ON public.settings USING btree (category);


--
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_settings_key ON public.settings USING btree (key);


--
-- Name: idx_stock_adjustments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_adjustments_created_at ON public.stock_adjustments USING btree (created_at);


--
-- Name: idx_stock_adjustments_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_adjustments_product_id ON public.stock_adjustments USING btree (product_id);


--
-- Name: idx_stock_adjustments_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_adjustments_type ON public.stock_adjustments USING btree (adjustment_type);


--
-- Name: idx_subcategories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_category_id ON public.subcategories USING btree (category_id);


--
-- Name: idx_subcategories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_name ON public.subcategories USING btree (name);


--
-- Name: idx_supplier_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_categories_name ON public.supplier_categories USING btree (name);


--
-- Name: idx_supplier_performance_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_performance_supplier_id ON public.supplier_performance USING btree (supplier_id);


--
-- Name: idx_suppliers_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_category ON public.suppliers USING btree (category);


--
-- Name: idx_suppliers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (name);


--
-- Name: idx_suppliers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_status ON public.suppliers USING btree (status);


--
-- Name: idx_user_activity_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_action ON public.user_activity_logs USING btree (action);


--
-- Name: idx_user_activity_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_created_at ON public.user_activity_logs USING btree (created_at);


--
-- Name: idx_user_activity_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_endpoint ON public.user_activity_logs USING btree (endpoint);


--
-- Name: idx_user_activity_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_action ON public.user_activity_logs USING btree (action);


--
-- Name: idx_user_activity_logs_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_composite ON public.user_activity_logs USING btree (user_id, action, created_at);


--
-- Name: idx_user_activity_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs USING btree (created_at);


--
-- Name: idx_user_activity_logs_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_resource ON public.user_activity_logs USING btree (resource_type, resource_id);


--
-- Name: idx_user_activity_logs_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_session_id ON public.user_activity_logs USING btree (session_id);


--
-- Name: idx_user_activity_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs USING btree (user_id);


--
-- Name: idx_user_activity_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_resource ON public.user_activity_logs USING btree (resource_type, resource_id);


--
-- Name: idx_user_activity_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_session ON public.user_activity_logs USING btree (session_id);


--
-- Name: idx_user_activity_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_user_id ON public.user_activity_logs USING btree (user_id);


--
-- Name: idx_user_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions USING btree (user_id);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active, last_activity);


--
-- Name: idx_user_sessions_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_is_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_login_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_login_at ON public.user_sessions USING btree (login_at);


--
-- Name: idx_user_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_session_id ON public.user_sessions USING btree (session_id);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: customers trigger_update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_customers_updated_at();


--
-- Name: origins trigger_update_origins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_origins_updated_at BEFORE UPDATE ON public.origins FOR EACH ROW EXECUTE FUNCTION public.update_origins_updated_at();


--
-- Name: pricing_rules trigger_update_pricing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_pricing_rules_updated_at();


--
-- Name: sales_orders trigger_update_sales_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_sales_orders_updated_at();


--
-- Name: brands update_brands_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expense_categories update_expense_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: origins update_origins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_origins_updated_at BEFORE UPDATE ON public.origins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_rules update_pricing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: purchase_order_line_items update_purchase_order_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_purchase_order_line_items_updated_at BEFORE UPDATE ON public.purchase_order_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: purchase_orders update_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_orders update_sales_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_returns update_sales_returns_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sales_returns_updated_at BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.update_sales_returns_updated_at();


--
-- Name: subcategories update_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_categories update_supplier_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_supplier_categories_updated_at BEFORE UPDATE ON public.supplier_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suppliers update_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_history approval_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: audit_settings audit_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_settings
    ADD CONSTRAINT audit_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: customer_due_transactions customer_due_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_due_transactions
    ADD CONSTRAINT customer_due_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_due_transactions customer_due_transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_due_transactions
    ADD CONSTRAINT customer_due_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_due_transactions customer_due_transactions_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_due_transactions
    ADD CONSTRAINT customer_due_transactions_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE SET NULL;


--
-- Name: data_changes data_changes_activity_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_changes
    ADD CONSTRAINT data_changes_activity_log_id_fkey FOREIGN KEY (activity_log_id) REFERENCES public.user_activity_logs(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE RESTRICT;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: expenses expenses_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: payment_history payment_history_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: payment_history payment_history_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payments payments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: payments payments_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: payments payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: pricing_rules pricing_rules_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: pricing_rules pricing_rules_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: products products_origin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_origin_id_fkey FOREIGN KEY (origin_id) REFERENCES public.origins(id) ON DELETE SET NULL;


--
-- Name: products products_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_line_items purchase_order_line_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_line_items
    ADD CONSTRAINT purchase_order_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_line_items purchase_order_line_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_line_items
    ADD CONSTRAINT purchase_order_line_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_timeline purchase_order_timeline_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_timeline
    ADD CONSTRAINT purchase_order_timeline_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: return_inventory_adjustments return_inventory_adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_inventory_adjustments
    ADD CONSTRAINT return_inventory_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: return_inventory_adjustments return_inventory_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_inventory_adjustments
    ADD CONSTRAINT return_inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: return_inventory_adjustments return_inventory_adjustments_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_inventory_adjustments
    ADD CONSTRAINT return_inventory_adjustments_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id) ON DELETE CASCADE;


--
-- Name: return_inventory_adjustments return_inventory_adjustments_return_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_inventory_adjustments
    ADD CONSTRAINT return_inventory_adjustments_return_item_id_fkey FOREIGN KEY (return_item_id) REFERENCES public.sales_return_items(id) ON DELETE CASCADE;


--
-- Name: return_refund_transactions return_refund_transactions_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_refund_transactions
    ADD CONSTRAINT return_refund_transactions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: return_refund_transactions return_refund_transactions_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_refund_transactions
    ADD CONSTRAINT return_refund_transactions_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id) ON DELETE CASCADE;


--
-- Name: role_hierarchy role_hierarchy_child_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_child_role_id_fkey FOREIGN KEY (child_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_hierarchy role_hierarchy_parent_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_fkey FOREIGN KEY (parent_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sales_order_line_items sales_order_line_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_line_items
    ADD CONSTRAINT sales_order_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: sales_order_line_items sales_order_line_items_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_order_line_items
    ADD CONSTRAINT sales_order_line_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: sales_receipts sales_receipts_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_receipts
    ADD CONSTRAINT sales_receipts_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_receipts sales_receipts_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_receipts
    ADD CONSTRAINT sales_receipts_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_return_items sales_return_items_original_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_original_line_item_id_fkey FOREIGN KEY (original_line_item_id) REFERENCES public.sales_order_line_items(id) ON DELETE RESTRICT;


--
-- Name: sales_return_items sales_return_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: sales_return_items sales_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id) ON DELETE CASCADE;


--
-- Name: sales_returns sales_returns_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: sales_returns sales_returns_authorized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_returns sales_returns_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: sales_returns sales_returns_original_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_original_order_id_fkey FOREIGN KEY (original_order_id) REFERENCES public.sales_orders(id) ON DELETE RESTRICT;


--
-- Name: sales_returns sales_returns_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_returns sales_returns_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_adjustments stock_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: supplier_performance supplier_performance_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_performance
    ADD CONSTRAINT supplier_performance_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: user_activity_logs user_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

