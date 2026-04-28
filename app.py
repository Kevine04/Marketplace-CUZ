from datetime import date, datetime
from decimal import Decimal
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-secret-change-me"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///boarding_house.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False, default="admin")


class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(20), unique=True, nullable=False)
    room_type = db.Column(db.String(50), nullable=False)
    monthly_rent = db.Column(db.Numeric(10, 2), nullable=False)
    capacity = db.Column(db.Integer, nullable=False, default=1)
    active = db.Column(db.Boolean, default=True)

    assignments = db.relationship("RoomAssignment", back_populates="room")

    @property
    def current_occupancy(self):
        return RoomAssignment.query.filter_by(room_id=self.id, active=True).count()

    @property
    def is_occupied(self):
        return self.current_occupancy >= self.capacity


class Tenant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    id_number = db.Column(db.String(50), unique=True, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    emergency_contact = db.Column(db.String(120), nullable=False)
    date_moved_in = db.Column(db.Date, nullable=False)
    date_moved_out = db.Column(db.Date)
    status = db.Column(db.String(20), nullable=False, default="active")

    assignments = db.relationship("RoomAssignment", back_populates="tenant")
    payments = db.relationship("Payment", back_populates="tenant")

    @property
    def current_assignment(self):
        return RoomAssignment.query.filter_by(tenant_id=self.id, active=True).first()


class RoomAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenant.id"), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey("room.id"), nullable=False)
    move_in_date = db.Column(db.Date, nullable=False, default=date.today)
    move_out_date = db.Column(db.Date)
    active = db.Column(db.Boolean, default=True)

    tenant = db.relationship("Tenant", back_populates="assignments")
    room = db.relationship("Room", back_populates="assignments")


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenant.id"), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey("room.id"), nullable=False)
    month = db.Column(db.String(7), nullable=False)  # YYYY-MM
    amount_expected = db.Column(db.Numeric(10, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False)
    balance_remaining = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    recorded_by = db.Column(db.String(50), nullable=False, default="admin")
    receipt_reference = db.Column(db.String(60), unique=True, nullable=False)

    tenant = db.relationship("Tenant", back_populates="payments")


def to_money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def compute_status(expected: Decimal, paid: Decimal, month: str) -> tuple[str, Decimal]:
    balance = (expected - paid).quantize(Decimal("0.01"))
    if paid >= expected:
        return "paid", Decimal("0.00")
    if paid > 0:
        return "partially paid", balance
    due_month = datetime.strptime(month + "-01", "%Y-%m-%d").date()
    return ("overdue" if due_month < date.today().replace(day=1) else "unpaid"), balance


@app.cli.command("init-db")
def init_db():
    db.create_all()
    if not User.query.filter_by(username="admin").first():
        db.session.add(User(username="admin", role="admin"))
        db.session.commit()


@app.route("/")
def dashboard():
    active_tenants = Tenant.query.filter(Tenant.status != "moved out").count()
    occupied_rooms = sum(1 for r in Room.query.all() if r.current_occupancy > 0)
    total_rooms = Room.query.count()
    unpaid_count = Payment.query.filter(Payment.status.in_(["unpaid", "partially paid", "overdue"])).count()

    month = request.args.get("month", date.today().strftime("%Y-%m"))
    month_income = db.session.query(func.coalesce(func.sum(Payment.amount_paid), 0)).filter_by(month=month).scalar()

    return render_template(
        "dashboard.html",
        active_tenants=active_tenants,
        occupied_rooms=occupied_rooms,
        total_rooms=total_rooms,
        unpaid_count=unpaid_count,
        month_income=month_income,
        month=month,
    )


@app.route("/tenants", methods=["GET", "POST"])
def tenants():
    if request.method == "POST":
        tenant = Tenant(
            full_name=request.form["full_name"],
            phone=request.form["phone"],
            id_number=request.form["id_number"],
            gender=request.form["gender"],
            emergency_contact=request.form["emergency_contact"],
            date_moved_in=datetime.strptime(request.form["date_moved_in"], "%Y-%m-%d").date(),
            status="active",
        )
        db.session.add(tenant)
        db.session.commit()
        flash("Tenant added.", "success")
        return redirect(url_for("tenants"))

    q = request.args.get("q", "").strip()
    query = Tenant.query
    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Tenant.full_name.ilike(like),
                Tenant.phone.ilike(like),
                Tenant.id_number.ilike(like),
            )
        )
    return render_template("tenants.html", tenants=query.order_by(Tenant.full_name).all(), q=q)


@app.route("/rooms", methods=["GET", "POST"])
def rooms():
    if request.method == "POST":
        room = Room(
            room_number=request.form["room_number"],
            room_type=request.form["room_type"],
            monthly_rent=to_money(request.form["monthly_rent"]),
            capacity=int(request.form["capacity"]),
        )
        db.session.add(room)
        db.session.commit()
        flash("Room added.", "success")
        return redirect(url_for("rooms"))

    return render_template("rooms.html", rooms=Room.query.order_by(Room.room_number).all())


@app.route("/assign", methods=["GET", "POST"])
def assign():
    tenants = Tenant.query.filter(Tenant.status != "moved out").order_by(Tenant.full_name).all()
    rooms = Room.query.order_by(Room.room_number).all()

    if request.method == "POST":
        tenant = Tenant.query.get_or_404(int(request.form["tenant_id"]))
        room = Room.query.get_or_404(int(request.form["room_id"]))

        if room.current_occupancy >= room.capacity:
            flash("Room is already full.", "danger")
            return redirect(url_for("assign"))

        current = tenant.current_assignment
        if current and current.room_id == room.id:
            flash("Tenant is already in that room.", "warning")
            return redirect(url_for("assign"))

        if current:
            current.active = False
            current.move_out_date = date.today()
            tenant.status = "shifted"

        assignment = RoomAssignment(tenant_id=tenant.id, room_id=room.id, move_in_date=date.today(), active=True)
        db.session.add(assignment)
        tenant.status = "active"
        db.session.commit()
        flash("Room assignment updated.", "success")
        return redirect(url_for("assign"))

    return render_template("assign.html", tenants=tenants, rooms=rooms)


@app.route("/move-out/<int:tenant_id>", methods=["POST"])
def move_out(tenant_id):
    tenant = Tenant.query.get_or_404(tenant_id)
    current = tenant.current_assignment
    if current:
        current.active = False
        current.move_out_date = date.today()
    tenant.status = "moved out"
    tenant.date_moved_out = date.today()
    db.session.commit()
    flash("Tenant moved out.", "success")
    return redirect(url_for("tenants"))


@app.route("/payments", methods=["GET", "POST"])
def payments():
    tenants = Tenant.query.filter(Tenant.status != "moved out").order_by(Tenant.full_name).all()

    if request.method == "POST":
        tenant = Tenant.query.get_or_404(int(request.form["tenant_id"]))
        assignment = tenant.current_assignment
        if not assignment:
            flash("Tenant has no active room assignment.", "danger")
            return redirect(url_for("payments"))

        month = request.form["month"]
        expected = to_money(request.form["amount_expected"])
        paid = to_money(request.form["amount_paid"])
        status, balance = compute_status(expected, paid, month)

        receipt_reference = f"RCPT-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
        payment = Payment(
            tenant_id=tenant.id,
            room_id=assignment.room_id,
            month=month,
            amount_expected=expected,
            amount_paid=paid,
            balance_remaining=balance,
            payment_date=datetime.strptime(request.form["payment_date"], "%Y-%m-%d").date(),
            payment_method=request.form["payment_method"],
            status=status,
            recorded_by=request.form.get("recorded_by", "admin"),
            receipt_reference=receipt_reference,
        )
        db.session.add(payment)
        db.session.commit()
        flash("Payment recorded.", "success")
        return redirect(url_for("receipt", payment_id=payment.id))

    month = request.args.get("month", date.today().strftime("%Y-%m"))
    rows = Payment.query.filter_by(month=month).order_by(Payment.payment_date.desc()).all()
    return render_template("payments.html", tenants=tenants, payments=rows, month=month)


@app.route("/reports")
def reports():
    month = request.args.get("month", date.today().strftime("%Y-%m"))
    paid = Payment.query.filter_by(month=month, status="paid").all()
    unpaid = Payment.query.filter(Payment.month == month, Payment.status.in_(["unpaid", "partially paid", "overdue"])).all()
    outstanding = db.session.query(func.coalesce(func.sum(Payment.balance_remaining), 0)).filter(Payment.month == month).scalar()
    monthly_income = db.session.query(func.coalesce(func.sum(Payment.amount_paid), 0)).filter(Payment.month == month).scalar()
    moved = Tenant.query.filter(Tenant.date_moved_out.isnot(None)).order_by(Tenant.date_moved_out.desc()).all()
    return render_template(
        "reports.html",
        month=month,
        paid=paid,
        unpaid=unpaid,
        outstanding=outstanding,
        monthly_income=monthly_income,
        moved=moved,
        rooms=Room.query.order_by(Room.room_number).all(),
    )


@app.route("/receipt/<int:payment_id>")
def receipt(payment_id):
    payment = Payment.query.get_or_404(payment_id)
    room = Room.query.get(payment.room_id)
    return render_template("receipt.html", payment=payment, room=room)


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5000)
