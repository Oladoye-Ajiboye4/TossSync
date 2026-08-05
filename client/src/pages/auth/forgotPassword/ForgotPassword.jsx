import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ToastContainer, toast, Bounce } from 'react-toastify';
import InputField from '../../../components/InputField';
import { Icon } from '@iconify/react';
import api from '../../../api/axios';

const ForgotPassword = () => {
    
    const [isSubmitted, setIsSubmitted] = useState(false);
    const navigate = useNavigate();

    // Toastify notification for success
    const notify = (message) => {
        toast.success(message, {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    };

    // Toastify notification for error 
    const errorNotify = (errorMessage) => {
        toast.error(`${errorMessage}`, {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    };

    // Formik handles all form validations and state management
    const formik = useFormik({
        initialValues: {
            email: '',
        },
        validateOnMount: true,
        validationSchema: Yup.object({
            email: Yup.string()
                .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address')
                .required('Required'),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const result = await api.post('/auth/forgot-password', { email: values.email });
                notify('Password reset link sent to your email!');
                setIsSubmitted(true);
                setTimeout(() => {
                    navigate('/signin');
                }, 3000);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    errorNotify('Email not found in our system');
                } else if (error.response && error.response.data && error.response.data.message) {
                    errorNotify(error.response.data.message);
                } else {
                    errorNotify('Unable to process request. Try again later');
                }
            } finally {
                setSubmitting(false);
            }
        },
    });

    return (
        <main className='min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-8'>
            <div className='w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
                <section className='hidden md:flex flex-col gap-5 p-8 rounded-3xl bg-white/70 backdrop-blur border border-tertiary/40 shadow-[0_20px_60px_-25px_rgba(120,53,15,0.45)]'>
                    <span className='text-sm font-semibold tracking-widest text-secondary uppercase'>Reset Password</span>
                    <h1 className='text-4xl font-extrabold text-secondary leading-tight'>Forgot your password? No worries!</h1>
                    <p className='text-[#5b4a3a]/80 text-base leading-relaxed'>Enter your email address and we'll send you a link to reset your password.</p>
                    <div className='flex items-center gap-3 text-[#5b4a3a]'>
                        <Icon icon="mdi:shield-check" width="24" height="24" className='text-secondary' />
                        <span className='text-sm font-medium'>Secure password reset process</span>
                    </div>
                    <div className='flex items-center gap-3 text-[#5b4a3a]'>
                        <Icon icon="mdi:email-fast" width="24" height="24" className='text-secondary' />
                        <span className='text-sm font-medium'>Link expires in 15 minutes</span>
                    </div>
                    <div className='flex items-center gap-3 text-[#5b4a3a]'>
                        <Icon icon="mdi:lock-reset" width="24" height="24" className='text-secondary' />
                        <span className='text-sm font-medium'>Set a new strong password</span>
                    </div>
                </section>

                <div className='w-full rounded-3xl bg-white/90 backdrop-blur border border-tertiary/40 shadow-[0_24px_70px_-35px_rgba(120,53,15,0.6)] p-6 sm:p-8'>
                    {!isSubmitted ? (
                        <>
                            <form className='flex flex-col gap-4' onSubmit={formik.handleSubmit}>
                                <div className='text-center space-y-2'>
                                    <div className='flex justify-center mb-4'>
                                        <div className='bg-primary/30 p-4 rounded-full'>
                                            <Icon icon="mdi:lock-question" width="40" height="40" className='text-secondary' />
                                        </div>
                                    </div>
                                    <h1 className='text-3xl sm:text-4xl font-extrabold text-secondary'>Forgot Password?</h1>
                                    <p className='text-sm sm:text-base text-[#5b4a3a]/70'>Enter your email to receive a reset link.</p>
                                </div>

                                <InputField type="text" name="email" placeholder="Email" formik={formik} />

                                <button
                                    type='submit'
                                    className='bg-secondary text-white py-3 rounded-xl font-bold shadow-lg hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed'
                                    disabled={!formik.isValid || formik.isSubmitting}
                                >
                                    {formik.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>

                            <div className='mt-6 flex flex-col sm:flex-row gap-3 font-semibold text-base text-secondary'>
                                <Link className='flex-1 text-center bg-tertiary/30 text-secondary py-3 rounded-xl hover:bg-tertiary/40 transition' to='/signin'>
                                    Back to Sign In
                                </Link>
                                <Link className='flex-1 text-center bg-tertiary/30 text-secondary py-3 rounded-xl hover:bg-tertiary/40 transition' to='/'>
                                    Go Home
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className='flex flex-col gap-4 items-center text-center'>
                            <div className='bg-green-100 p-4 rounded-full'>
                                <Icon icon="mdi:email-check" width="40" height="40" className='text-green-700' />
                            </div>
                            <h2 className='text-2xl font-extrabold text-secondary'>Check Your Email!</h2>
                            <p className='text-[#5b4a3a]/70'>
                                We've sent a password reset link to <span className='font-semibold text-secondary'>{formik.values.email}</span>
                            </p>
                            <p className='text-sm text-[#5b4a3a]/60'>
                                Didn't receive it? Check your spam folder or try again.
                            </p>
                            <Link
                                to='/signin'
                                className='mt-4 w-full bg-secondary text-white py-3 rounded-xl hover:brightness-95 transition font-semibold'
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <ToastContainer position="top-center" theme="light" transition={Bounce} />
        </main>
    );
};

export default ForgotPassword;
