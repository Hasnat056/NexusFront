import type { ChangeEvent } from "react";
import { Avatar } from "./Avatar";
import type { PersonFormShape, QualificationFormItem } from "../../types/dashboard";
import styles from "./Form.module.css";

interface PersonFormFieldsProps<T extends PersonFormShape> {
  value: T;
  onChange: (value: T) => void;
  isCreate: boolean;
  /** Field names PersonSerializer marks read_only for the current caller (e.g. AdminSerializer
   * locks first_name/last_name/father_name/cnic/gender/dob/institutional_email when an Admin
   * edits their own profile — self-service can't change identity fields, only contact/address/
   * qualifications). Locked inputs render read-only/disabled instead of being omitted, so the
   * value is still visible. */
  lockedFields?: (keyof PersonFormShape)[];
}

function emptyQualificationRow(): QualificationFormItem {
  return {
    degree_title: "",
    education_board: "",
    passing_year: "",
    institution: "",
    total_marks: "",
    obtained_marks: "",
    is_current: false,
  };
}

/**
 * The nested Person(+Address+Qualifications) section shared by the Faculty and Student
 * create/edit forms — mirrors PersonSerializer's fields (AdminModule/serializers.py).
 * person_id and the username half of `user` are server-derived (create_mixin), so they're
 * never editable here; password/confirm_password are only shown on create — update_mixin
 * never touches the account's password, only PersonSerializerMixin.create_mixin does (via
 * User.objects.create_user). qualification_set is a real repeatable nested serializer
 * (QualificationSerializer, many=True) — create_mixin/update_mixin both replace the whole
 * set from whatever rows are submitted here.
 * Generic over T so the caller's onChange (typed to its own FacultyFormValue/StudentFormValue)
 * stays sound — this component only ever spreads {...value, [key]: val}, never drops the
 * caller's extra fields.
 */
export function PersonFormFields<T extends PersonFormShape>({
  value,
  onChange,
  isCreate,
  lockedFields = [],
}: PersonFormFieldsProps<T>) {
  function set<K extends keyof PersonFormShape>(key: K, val: PersonFormShape[K]) {
    onChange({ ...value, [key]: val });
  }

  function isLocked(key: keyof PersonFormShape) {
    return lockedFields.includes(key);
  }

  function setAddress(key: keyof PersonFormShape["address"], val: string) {
    onChange({ ...value, address: { ...value.address, [key]: val } });
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    set("image", URL.createObjectURL(file));
  }

  function setQualification<K extends keyof QualificationFormItem>(index: number, key: K, val: QualificationFormItem[K]) {
    const next = value.qualification_set.map((q, i) => (i === index ? { ...q, [key]: val } : q));
    onChange({ ...value, qualification_set: next });
  }

  function addQualification() {
    onChange({ ...value, qualification_set: [...value.qualification_set, emptyQualificationRow()] });
  }

  function removeQualification(index: number) {
    onChange({ ...value, qualification_set: value.qualification_set.filter((_, i) => i !== index) });
  }

  const fullName = `${value.first_name} ${value.last_name}`.trim();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Personal details</h3>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="first_name">First name</label>
          <input
            id="first_name"
            value={value.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            readOnly={isLocked("first_name")}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="last_name">Last name</label>
          <input
            id="last_name"
            value={value.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            readOnly={isLocked("last_name")}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="father_name">Father's name</label>
          <input
            id="father_name"
            value={value.father_name}
            onChange={(e) => set("father_name", e.target.value)}
            readOnly={isLocked("father_name")}
            required
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="gender">Gender</label>
          <select id="gender" value={value.gender} onChange={(e) => set("gender", e.target.value)} disabled={isLocked("gender")}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Others">Others</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="dob">Date of birth</label>
          <input
            id="dob"
            type="date"
            value={value.dob}
            onChange={(e) => set("dob", e.target.value)}
            readOnly={isLocked("dob")}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="cnic">CNIC</label>
          <input
            id="cnic"
            value={value.cnic}
            onChange={(e) => set("cnic", e.target.value)}
            placeholder="35202-1234567-1"
            readOnly={isLocked("cnic")}
            required
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="personal_email">Personal email</label>
          <input
            id="personal_email"
            type="email"
            value={value.personal_email}
            onChange={(e) => set("personal_email", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="contact_number">Contact number</label>
          <input id="contact_number" value={value.contact_number} onChange={(e) => set("contact_number", e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="religion">Religion</label>
          <input id="religion" value={value.religion} onChange={(e) => set("religion", e.target.value)} />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="image">Photo</label>
          <div className={styles.imageRow}>
            <Avatar src={value.image} name={fullName || "?"} size={44} />
            <input id="image" type="file" accept="image/jpeg,image/png" onChange={handleImageChange} />
            {value.image && (
              <button type="button" className={styles.linkButton} onClick={() => set("image", null)}>
                Remove
              </button>
            )}
          </div>
          <span className={styles.hint}>Proxied to Cloudinary by the backend on submit — jpeg/png only.</span>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Account</h3>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="institutional_email">Institutional email</label>
          <input
            id="institutional_email"
            type="email"
            value={value.institutional_email}
            onChange={(e) => set("institutional_email", e.target.value)}
            readOnly={isLocked("institutional_email")}
            required
          />
          <span className={styles.hint}>Also becomes the login username.</span>
        </div>
        {isCreate && (
          <>
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={value.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="confirm_password">Confirm password</label>
              <input
                id="confirm_password"
                type="password"
                value={value.confirm_password}
                onChange={(e) => set("confirm_password", e.target.value)}
                required
              />
              {value.confirm_password && value.confirm_password !== value.password && (
                <span className={styles.fieldError}>Passwords don't match.</span>
              )}
            </div>
          </>
        )}
      </div>

      <h3 className={styles.sectionTitle}>Address</h3>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="country">Country</label>
          <input id="country" value={value.address.country} onChange={(e) => setAddress("country", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="province">Province</label>
          <input id="province" value={value.address.province} onChange={(e) => setAddress("province", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="city">City</label>
          <input id="city" value={value.address.city} onChange={(e) => setAddress("city", e.target.value)} />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="zipcode">Zip code</label>
          <input id="zipcode" inputMode="numeric" value={value.address.zipcode} onChange={(e) => setAddress("zipcode", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="street_address">Street address</label>
          <input
            id="street_address"
            value={value.address.street_address}
            onChange={(e) => setAddress("street_address", e.target.value)}
          />
        </div>
      </div>

      <div className={styles.qualificationsHead}>
        <h3 className={styles.sectionTitle}>Qualifications</h3>
        <button type="button" className={styles.linkButton} onClick={addQualification}>
          + Add qualification
        </button>
      </div>
      {value.qualification_set.length === 0 && <p className={styles.hint}>No qualifications added yet.</p>}
      {value.qualification_set.map((q, index) => (
        <div className={styles.qualRow} key={index}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={`degree_title_${index}`}>Degree title</label>
              <input
                id={`degree_title_${index}`}
                value={q.degree_title}
                onChange={(e) => setQualification(index, "degree_title", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`institution_${index}`}>Institution</label>
              <input
                id={`institution_${index}`}
                value={q.institution}
                onChange={(e) => setQualification(index, "institution", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`education_board_${index}`}>Education board</label>
              <input
                id={`education_board_${index}`}
                value={q.education_board}
                onChange={(e) => setQualification(index, "education_board", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={`passing_year_${index}`}>Passing year</label>
              <input
                id={`passing_year_${index}`}
                inputMode="numeric"
                value={q.passing_year}
                onChange={(e) => setQualification(index, "passing_year", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`total_marks_${index}`}>Total marks</label>
              <input
                id={`total_marks_${index}`}
                inputMode="numeric"
                value={q.total_marks}
                onChange={(e) => setQualification(index, "total_marks", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`obtained_marks_${index}`}>Obtained marks</label>
              <input
                id={`obtained_marks_${index}`}
                inputMode="numeric"
                value={q.obtained_marks}
                onChange={(e) => setQualification(index, "obtained_marks", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.qualRowFooter}>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={q.is_current}
                onChange={(e) => setQualification(index, "is_current", e.target.checked)}
              />
              Currently studying
            </label>
            <button type="button" className={styles.linkButton} onClick={() => removeQualification(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
