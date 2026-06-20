'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transport_routes", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "description": {
        type: Sequelize.TEXT,
      },
      "monthly_fee": {
        type: Sequelize.DECIMAL(12, 2),
      },
    });
    await queryInterface.addIndex("transport_routes", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("transport_routes", ["institution_id"]);
    await queryInterface.createTable("vehicles", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "plate_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "type": {
        type: Sequelize.ENUM("bus", "van", "car"),
        allowNull: false,
      },
      "capacity": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "model": {
        type: Sequelize.STRING,
      },
      "year": {
        type: Sequelize.INTEGER,
      },
      "driver_id": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "route_id": {
        type: Sequelize.UUID,
        references: {
          model: "transport_routes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "gps_device_id": {
        type: Sequelize.STRING,
      },
      "insurance_expiry": {
        type: Sequelize.DATEONLY,
      },
      "roadworthy_expiry": {
        type: Sequelize.DATEONLY,
      },
    });
    await queryInterface.addIndex("vehicles", ["institution_id", "plate_number"], { unique: true });
    await queryInterface.addIndex("vehicles", ["institution_id"]);
    await queryInterface.addIndex("vehicles", ["driver_id"]);
    await queryInterface.addIndex("vehicles", ["route_id"]);
    await queryInterface.createTable("route_stops", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "route_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "transport_routes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "stop_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "latitude": {
        type: Sequelize.DECIMAL(10, 7),
      },
      "longitude": {
        type: Sequelize.DECIMAL(10, 7),
      },
      "stop_order": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "morning_time": {
        type: Sequelize.TIME,
      },
      "afternoon_time": {
        type: Sequelize.TIME,
      },
    });
    await queryInterface.addIndex("route_stops", ["route_id", "stop_order"], { unique: true });
    await queryInterface.addIndex("route_stops", ["route_id"]);
    await queryInterface.createTable("student_transport", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "route_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "transport_routes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "stop_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "route_stops",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "vehicle_id": {
        type: Sequelize.UUID,
        references: {
          model: "vehicles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "academic_year_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "academic_years",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "pickup_type": {
        type: Sequelize.ENUM("morning", "afternoon", "both"),
        allowNull: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "active",
      },
    });
    await queryInterface.addIndex("student_transport", ["student_id", "academic_year_id"], { unique: true });
    await queryInterface.addIndex("student_transport", ["student_id"]);
    await queryInterface.addIndex("student_transport", ["route_id"]);
    await queryInterface.addIndex("student_transport", ["stop_id"]);
    await queryInterface.addIndex("student_transport", ["vehicle_id"]);
    await queryInterface.addIndex("student_transport", ["academic_year_id"]);
    await queryInterface.createTable("transport_trips", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "vehicle_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "vehicles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "route_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "transport_routes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "driver_id": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "trip_type": {
        type: Sequelize.ENUM("morning", "afternoon"),
        allowNull: false,
      },
      "date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "departure_time": {
        type: Sequelize.TIME,
      },
      "arrival_time": {
        type: Sequelize.TIME,
      },
      "status": {
        type: Sequelize.ENUM("pending", "in_progress", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
    });
    await queryInterface.addIndex("transport_trips", ["vehicle_id", "route_id", "date", "trip_type"], { unique: true });
    await queryInterface.addIndex("transport_trips", ["vehicle_id"]);
    await queryInterface.addIndex("transport_trips", ["route_id"]);
    await queryInterface.addIndex("transport_trips", ["driver_id"]);
    await queryInterface.createTable("transport_attendance", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "trip_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "transport_trips",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "status": {
        type: Sequelize.ENUM("boarded", "absent", "dropped_off"),
        allowNull: false,
      },
      "boarded_at": {
        type: Sequelize.DATE,
      },
      "dropped_at": {
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("transport_attendance", ["trip_id", "student_id"], { unique: true });
    await queryInterface.addIndex("transport_attendance", ["trip_id"]);
    await queryInterface.addIndex("transport_attendance", ["student_id"]);
    await queryInterface.createTable("hostels", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "gender": {
        type: Sequelize.ENUM("male", "female", "mixed"),
        allowNull: false,
      },
      "warden_id": {
        type: Sequelize.UUID,
        references: {
          model: "staff",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "capacity": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
    await queryInterface.addIndex("hostels", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("hostels", ["institution_id"]);
    await queryInterface.addIndex("hostels", ["warden_id"]);
    await queryInterface.createTable("hostel_rooms", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "hostel_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "room_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "floor": {
        type: Sequelize.STRING,
      },
      "capacity": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "room_type": {
        type: Sequelize.ENUM("dormitory", "private", "shared"),
        allowNull: false,
      },
    });
    await queryInterface.addIndex("hostel_rooms", ["hostel_id", "room_number"], { unique: true });
    await queryInterface.addIndex("hostel_rooms", ["hostel_id"]);
    await queryInterface.createTable("hostel_beds", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "room_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostel_rooms",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "bed_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "status": {
        type: Sequelize.ENUM("available", "occupied", "maintenance"),
        allowNull: false,
        defaultValue: "available",
      },
    });
    await queryInterface.addIndex("hostel_beds", ["room_id", "bed_number"], { unique: true });
    await queryInterface.addIndex("hostel_beds", ["room_id"]);
    await queryInterface.createTable("hostel_allocations", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "bed_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostel_beds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "room_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostel_rooms",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "hostel_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "academic_year_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "academic_years",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "check_in_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "check_out_date": {
        type: Sequelize.DATEONLY,
      },
      "status": {
        type: Sequelize.ENUM("active", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "active",
      },
    });
    await queryInterface.addIndex("hostel_allocations", ["student_id", "academic_year_id"], { unique: true });
    await queryInterface.addIndex("hostel_allocations", ["student_id"]);
    await queryInterface.addIndex("hostel_allocations", ["bed_id"]);
    await queryInterface.addIndex("hostel_allocations", ["room_id"]);
    await queryInterface.addIndex("hostel_allocations", ["hostel_id"]);
    await queryInterface.addIndex("hostel_allocations", ["academic_year_id"]);
    await queryInterface.createTable("hostel_visitors", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "hostel_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "visitor_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "visitor_phone": {
        type: Sequelize.STRING,
      },
      "relationship": {
        type: Sequelize.STRING,
      },
      "visit_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "check_in_time": {
        type: Sequelize.TIME,
      },
      "check_out_time": {
        type: Sequelize.TIME,
      },
      "approved_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    });
    await queryInterface.addIndex("hostel_visitors", ["hostel_id"]);
    await queryInterface.addIndex("hostel_visitors", ["student_id"]);
    await queryInterface.addIndex("hostel_visitors", ["approved_by"]);
    await queryInterface.createTable("hostel_attendance", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "hostel_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "hostels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "session": {
        type: Sequelize.ENUM("morning", "evening", "night"),
        allowNull: false,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });
    await queryInterface.addIndex("hostel_attendance", ["hostel_id", "student_id", "date", "session"], { unique: true });
    await queryInterface.addIndex("hostel_attendance", ["hostel_id"]);
    await queryInterface.addIndex("hostel_attendance", ["student_id"]);
    await queryInterface.createTable("inventory_categories", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "description": {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex("inventory_categories", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("inventory_categories", ["institution_id"]);
    await queryInterface.createTable("inventory_items", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "category_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "inventory_categories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "description": {
        type: Sequelize.TEXT,
      },
      "unit": {
        type: Sequelize.STRING,
      },
      "barcode": {
        type: Sequelize.STRING,
      },
      "current_stock": {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      "min_stock_level": {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      "unit_cost": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      "location": {
        type: Sequelize.STRING,
      },
      "status": {
        type: Sequelize.ENUM("active", "inactive", "discontinued"),
        allowNull: false,
        defaultValue: "active",
      },
    });
    await queryInterface.addIndex("inventory_items", ["institution_id", "barcode"], { unique: true });
    await queryInterface.addIndex("inventory_items", ["institution_id"]);
    await queryInterface.addIndex("inventory_items", ["category_id"]);
    await queryInterface.createTable("stock_movements", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "item_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "inventory_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "movement_type": {
        type: Sequelize.ENUM("in", "out", "adjustment", "damage"),
        allowNull: false,
      },
      "quantity": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "previous_stock": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "new_stock": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "reference": {
        type: Sequelize.STRING,
      },
      "moved_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "moved_at": {
        type: Sequelize.DATE,
        allowNull: false,
      },
      "notes": {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex("stock_movements", ["item_id"]);
    await queryInterface.addIndex("stock_movements", ["moved_by"]);
    await queryInterface.createTable("purchase_orders", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "supplier_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "supplier_contact": {
        type: Sequelize.STRING,
      },
      "items": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "total_amount": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "status": {
        type: Sequelize.ENUM("draft", "approved", "received", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
      "ordered_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "ordered_at": {
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("purchase_orders", ["institution_id"]);
    await queryInterface.addIndex("purchase_orders", ["ordered_by"]);
    await queryInterface.createTable("timetable_periods", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "start_time": {
        type: Sequelize.TIME,
        allowNull: false,
      },
      "end_time": {
        type: Sequelize.TIME,
        allowNull: false,
      },
      "is_break": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("timetable_periods", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("timetable_periods", ["institution_id"]);
    await queryInterface.createTable("timetables", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "class_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "academic_year_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "academic_years",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "term_id": {
        type: Sequelize.UUID,
        references: {
          model: "terms_semesters",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "is_active": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      "published_at": {
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("timetables", ["institution_id", "academic_year_id"]);
    await queryInterface.addIndex("timetables", ["class_id", "academic_year_id", "term_id"], { unique: true });
    await queryInterface.addIndex("timetables", ["institution_id"]);
    await queryInterface.addIndex("timetables", ["class_id"]);
    await queryInterface.addIndex("timetables", ["academic_year_id"]);
    await queryInterface.addIndex("timetables", ["term_id"]);
    await queryInterface.createTable("timetable_slots", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "timetable_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "timetables",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "period_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "timetable_periods",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "day_of_week": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "subject_id": {
        type: Sequelize.UUID,
        references: {
          model: "subjects",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "teacher_id": {
        type: Sequelize.UUID,
        references: {
          model: "staff",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "room": {
        type: Sequelize.STRING,
      },
      "is_free_period": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("timetable_slots", ["timetable_id", "period_id", "day_of_week"], { unique: true });
    await queryInterface.addIndex("timetable_slots", ["timetable_id"]);
    await queryInterface.addIndex("timetable_slots", ["period_id"]);
    await queryInterface.addIndex("timetable_slots", ["subject_id"]);
    await queryInterface.addIndex("timetable_slots", ["teacher_id"]);
    await queryInterface.createTable("salary_grades", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "grade_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "basic_salary": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "allowances": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      "deductions": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    });
    await queryInterface.addIndex("salary_grades", ["institution_id", "grade_name"], { unique: true });
    await queryInterface.addIndex("salary_grades", ["institution_id"]);
    await queryInterface.createTable("payroll_runs", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "month": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "year": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "status": {
        type: Sequelize.ENUM("draft", "processing", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
      "processed_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "processed_at": {
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("payroll_runs", ["institution_id", "month", "year"], { unique: true });
    await queryInterface.addIndex("payroll_runs", ["institution_id"]);
    await queryInterface.addIndex("payroll_runs", ["processed_by"]);
    await queryInterface.createTable("payroll_records", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "payroll_run_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "payroll_runs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "staff_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "staff",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "basic_salary": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "allowances": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      "deductions": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      "net_salary": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "payment_method": {
        type: Sequelize.ENUM("cash", "mobile_money", "bank", "card"),
        allowNull: false,
      },
      "payment_status": {
        type: Sequelize.ENUM("pending", "paid", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      "payment_date": {
        type: Sequelize.DATEONLY,
      },
    });
    await queryInterface.addIndex("payroll_records", ["payroll_run_id", "staff_id"], { unique: true });
    await queryInterface.addIndex("payroll_records", ["payroll_run_id"]);
    await queryInterface.addIndex("payroll_records", ["staff_id"]);
    await queryInterface.createTable("leave_types", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "days_per_year": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "is_paid": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    });
    await queryInterface.addIndex("leave_types", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("leave_types", ["institution_id"]);
    await queryInterface.createTable("leave_requests", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "staff_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "staff",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "leave_type_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "leave_types",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "start_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "end_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "days_count": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "reason": {
        type: Sequelize.TEXT,
      },
      "status": {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      "approved_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    });
    await queryInterface.addIndex("leave_requests", ["staff_id"]);
    await queryInterface.addIndex("leave_requests", ["leave_type_id"]);
    await queryInterface.addIndex("leave_requests", ["approved_by"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("leave_requests");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leave_requests_status";');
    await queryInterface.dropTable("leave_types");
    await queryInterface.dropTable("payroll_records");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payroll_records_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payroll_records_payment_status";');
    await queryInterface.dropTable("payroll_runs");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payroll_runs_status";');
    await queryInterface.dropTable("salary_grades");
    await queryInterface.dropTable("timetable_slots");
    await queryInterface.dropTable("timetables");
    await queryInterface.dropTable("timetable_periods");
    await queryInterface.dropTable("purchase_orders");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purchase_orders_status";');
    await queryInterface.dropTable("stock_movements");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_movements_movement_type";');
    await queryInterface.dropTable("inventory_items");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_inventory_items_status";');
    await queryInterface.dropTable("inventory_categories");
    await queryInterface.dropTable("hostel_attendance");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hostel_attendance_session";');
    await queryInterface.dropTable("hostel_visitors");
    await queryInterface.dropTable("hostel_allocations");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hostel_allocations_status";');
    await queryInterface.dropTable("hostel_beds");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hostel_beds_status";');
    await queryInterface.dropTable("hostel_rooms");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hostel_rooms_room_type";');
    await queryInterface.dropTable("hostels");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hostels_gender";');
    await queryInterface.dropTable("transport_attendance");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transport_attendance_status";');
    await queryInterface.dropTable("transport_trips");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transport_trips_trip_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transport_trips_status";');
    await queryInterface.dropTable("student_transport");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_student_transport_pickup_type";');
    await queryInterface.dropTable("route_stops");
    await queryInterface.dropTable("vehicles");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vehicles_type";');
    await queryInterface.dropTable("transport_routes");
  },
};
