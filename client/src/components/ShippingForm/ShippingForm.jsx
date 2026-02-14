// client/src/components/ShippingForm/ShippingForm.jsx

import React, { useState } from 'react';
import styles from './ShippingForm.module.css';

export default function ShippingForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    postalCode: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.heading}>Shipping Details</h3>

      <input
        type="text" name="firstName" placeholder="First Name"
        value={formData.firstName} onChange={handleChange}
        required disabled={loading} className={styles.input}
      />
      <input
        type="text" name="lastName" placeholder="Last Name"
        value={formData.lastName} onChange={handleChange}
        required disabled={loading} className={styles.input}
      />
      <input
        type="text" name="postalCode" placeholder="Postal Code"
        value={formData.postalCode} onChange={handleChange}
        required disabled={loading} className={styles.input}
      />

      <button type="submit" disabled={loading} className={styles.btn}>
        {loading ? 'Starting...' : 'Proceed to Checkout'}
      </button>
    </form>
  );
}
