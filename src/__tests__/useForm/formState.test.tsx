import React from 'react';
import {
  act as actComponent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';

import { VALIDATION_MODE } from '../../constants';
import { Controller } from '../../controller';
import { useFieldArray } from '../../useFieldArray';
import { useForm } from '../../useForm';

describe('formState', () => {
  describe('isValid', () => {
    it('should return isValid correctly with resolver', async () => {
      let isValidValue = false;

      const Component = () => {
        const {
          register,
          formState: { isValid },
        } = useForm<{ test: string }>({
          mode: 'onChange',
          resolver: async (data) => {
            return {
              values: data.test ? data : {},
              errors: data.test
                ? {}
                : {
                    test: {
                      message: 'issue',
                      type: 'test',
                    },
                  },
            };
          },
        });

        isValidValue = isValid;
        return <input {...register('test')} />;
      };

      render(<Component />);

      expect(isValidValue).toBeFalsy();

      fireEvent.input(screen.getByRole('textbox'), {
        target: {
          value: 'test',
        },
      });

      await waitFor(() => expect(isValidValue).toBeTruthy());
    });

    it('should return true for onBlur mode by default', async () => {
      const App = () => {
        const {
          formState: { isValid },
        } = useForm<{ test: string }>({
          mode: VALIDATION_MODE.onBlur,
        });

        return <p>{isValid ? 'valid' : 'invalid'}</p>;
      };

      render(<App />);

      expect(await screen.findByText('valid')).toBeVisible();
    });

    it('should return true for onChange mode by default', async () => {
      const App = () => {
        const {
          formState: { isValid },
        } = useForm<{ test: string }>({
          mode: VALIDATION_MODE.onChange,
        });

        return <p>{isValid ? 'valid' : 'invalid'}</p>;
      };

      render(<App />);

      expect(await screen.findByText('valid')).toBeVisible();
    });

    it('should return true for all mode by default', async () => {
      const App = () => {
        const {
          formState: { isValid },
        } = useForm<{ test: string }>({
          mode: VALIDATION_MODE.all,
        });

        return <p>{isValid ? 'valid' : 'invalid'}</p>;
      };

      render(<App />);

      expect(await screen.findByText('valid')).toBeVisible();
    });

    it('should return false when default value is not valid value', async () => {
      const { result } = renderHook(() => {
        const methods = useForm<{ input: string; issue: string }>({
          mode: VALIDATION_MODE.onChange,
        });

        methods.formState.isValid;

        return methods;
      });

      await act(async () => {
        result.current.register('issue', { required: true });
        result.current.setValue('issue', '', { shouldValidate: true });
      });

      expect(result.current.formState.isValid).toBeFalsy();
    });

    it('should return false when custom register with validation', async () => {
      const { result } = renderHook(() =>
        useForm<{ input: string; issue: string }>({
          mode: VALIDATION_MODE.onChange,
        }),
      );

      result.current.formState.isValid;

      await act(async () => {
        result.current.register('issue', { required: true });
      });

      expect(result.current.formState.isValid).toBeFalsy();
    });

    it('should update valid when toggle Controller', async () => {
      const App = () => {
        const {
          control,
          watch,
          formState: { isValid },
        } = useForm({
          mode: 'onChange',
          shouldUnregister: true,
        });
        const test = watch('test');

        return (
          <div>
            <p>{isValid ? 'valid' : 'invalid'}</p>
            <Controller
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <select {...field} data-testid="select">
                  <option value={''}></option>
                  <option value={'test'}>test</option>
                  <option value={'test1'}>test1</option>
                </select>
              )}
              name={'test'}
            />

            {test === 'test1' && (
              <>
                <Controller
                  control={control}
                  render={({ field }) => <input {...field} />}
                  rules={{ required: true }}
                  name={'first.test'}
                />
                <Controller
                  control={control}
                  render={({ field }) => <input {...field} />}
                  rules={{ required: true }}
                  name={'first.test1'}
                />
              </>
            )}
          </div>
        );
      };

      render(<App />);

      expect(screen.getByText('invalid')).toBeVisible();

      fireEvent.change(screen.getByTestId('select'), {
        target: {
          value: 'test',
        },
      });

      expect(await screen.findByText('valid')).toBeVisible();

      fireEvent.change(screen.getByTestId('select'), {
        target: {
          value: 'test1',
        },
      });

      expect(await screen.findByText('invalid')).toBeVisible();

      fireEvent.change(screen.getByTestId('select'), {
        target: {
          value: 'test',
        },
      });

      expect(await screen.findByText('valid')).toBeVisible();

      fireEvent.change(screen.getByTestId('select'), {
        target: {
          value: 'test1',
        },
      });

      expect(await screen.findByText('invalid')).toBeVisible();
    });
  });

  it('should be a proxy object that returns undefined for unknown properties', () => {
    const { result } = renderHook(() => useForm());

    // @ts-expect-error
    expect(result.current.formState.nonExistentProperty).toBeUndefined();
  });

  it('should be a proxy object that properly implements the has trap', () => {
    const { result } = renderHook(() => useForm());

    expect('nonExistentProperty' in result.current.formState).toBeFalsy();
  });

  it('should be a proxy object that hasOwnProperty works on', () => {
    const { result } = renderHook(() => useForm());

    expect(result.current.formState).toHaveProperty('hasOwnProperty');
  });

  describe('when using with reset API', () => {
    type FormValues = {
      foo: string;
      foo1: string;
    };

    it('should render isValid as true with reset at useEffect with valid data', async () => {
      function Component() {
        const {
          register,
          control,
          formState: { isValid },
          reset,
        } = useForm<FormValues>({
          mode: 'onBlur',
          defaultValues: { foo: '', foo1: '' },
        });

        React.useEffect(() => {
          reset({ foo: 'test', foo1: 'test2' });
        }, [reset]);

        return (
          <div>
            <h2>Form with controlled input</h2>
            <Controller
              name="foo"
              rules={{ required: true }}
              control={control}
              render={({ field }) => <input {...field} />}
            />
            <input {...register('foo1', { required: true })} />
            {isValid ? 'valid' : 'nope'}
          </div>
        );
      }

      render(<Component />);

      expect(await screen.findByText('valid')).toBeVisible();
    });

    it('should render isValid as false with reset at useEffect with valid data', async () => {
      function Component() {
        const {
          register,
          control,
          formState: { isValid },
          reset,
        } = useForm<FormValues>({
          mode: 'onBlur',
          defaultValues: { foo: '', foo1: '' },
        });

        React.useEffect(() => {
          reset({ foo: 'test', foo1: '' });
        }, [reset]);

        return (
          <div>
            <h2>Form with controlled input</h2>
            <Controller
              name="foo"
              rules={{ required: true }}
              control={control}
              render={({ field }) => <input {...field} />}
            />
            <input {...register('foo1', { required: true })} />
            {isValid ? 'valid' : 'nope'}
          </div>
        );
      }

      render(<Component />);

      expect(await screen.findByText('nope')).toBeVisible();
    });
  });

  it('should set isSubmitSuccessful to false when there is a promise reject', async () => {
    const rejectPromiseFn = jest
      .fn()
      .mockRejectedValue(new Error('this is an error'));

    const App = () => {
      const {
        register,
        handleSubmit,
        formState: { isSubmitSuccessful, isSubmitted },
      } = useForm();

      return (
        <form>
          <input {...register('test')} />
          <p>{isSubmitted ? 'isSubmitted' : 'no'}</p>
          <p>
            {isSubmitSuccessful
              ? 'isSubmitSuccessful'
              : 'isNotSubmitSuccessful'}
          </p>
          <button
            type={'button'}
            onClick={() => handleSubmit(rejectPromiseFn)().catch(() => {})}
          >
            Submit
          </button>
        </form>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('isSubmitted')).toBeVisible();
    expect(screen.getByText('isNotSubmitSuccessful')).toBeVisible();
  });

  it('should update correct isValid formState with dynamic fields', async () => {
    const Component = () => {
      const {
        register,
        control,
        formState: { isValid },
      } = useForm<{
        list: {
          firstName: string;
          lastName: string;
        }[];
        test: string;
        test1: string;
        test2: string;
        test3: string;
      }>({
        mode: 'onChange',
      });
      const { append, fields } = useFieldArray({
        control,
        name: 'list',
      });

      return (
        <form>
          <Controller
            render={({ field }) => (
              <input {...field} placeholder={field.name} />
            )}
            name={'test'}
            rules={{ required: true }}
            control={control}
            defaultValue={''}
          />
          <input
            {...register('test1', { required: true })}
            placeholder={'test1'}
          />
          <input {...register('test2')} placeholder={'test2'} />
          <Controller
            render={({ field }) => (
              <input {...field} placeholder={field.name} />
            )}
            name={'test3'}
            control={control}
            defaultValue={''}
          />
          {fields.map((field, index) => {
            return (
              <div key={field.id}>
                <Controller
                  render={({ field }) => (
                    <input {...field} placeholder={field.name} />
                  )}
                  name={`list.${index}.firstName` as const}
                  control={control}
                  rules={{ required: true }}
                />
                <input
                  {...register(`list.${index}.lastName` as const, {
                    required: true,
                  })}
                  placeholder={`list.${index}.lastName`}
                />
              </div>
            );
          })}
          <button
            type={'button'}
            onClick={() =>
              append({
                firstName: '',
                lastName: '',
              })
            }
          >
            append
          </button>
          <p>{isValid ? 'valid' : 'inValid'}</p>
        </form>
      );
    };

    render(<Component />);

    expect(await screen.findByText('inValid')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('test'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByPlaceholderText('test1'), {
      target: { value: '1' },
    });

    expect(await screen.findByText('valid')).toBeVisible();

    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('inValid')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('list.0.firstName'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByPlaceholderText('list.0.lastName'), {
      target: { value: '1' },
    });

    expect(await screen.findByText('valid')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('list.0.lastName'), {
      target: { value: '' },
    });

    expect(await screen.findByText('inValid')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('list.0.lastName'), {
      target: { value: '1' },
    });

    expect(await screen.findByText('valid')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('list.0.firstName'), {
      target: { value: '' },
    });

    expect(await screen.findByText('inValid')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('list.0.firstName'), {
      target: { value: '1' },
    });

    expect(await screen.findByText('valid')).toBeVisible();
  });

  describe('when defaultValue supplied', () => {
    it('should update isValid to true for validation with inline defaultValue', async () => {
      function App() {
        const {
          register,
          formState: { isValid },
        } = useForm({
          mode: 'onChange',
        });

        return (
          <form>
            <input
              {...register('value', { required: true })}
              defaultValue="Any default value!"
            />
            <p>isValid = {isValid ? 'true' : 'false'}</p>
          </form>
        );
      }

      render(<App />);

      expect(await screen.findByText('isValid = true')).toBeVisible();
    });

    it('should update isValid to true for Controller validation', async () => {
      function App() {
        const {
          control,
          formState: { isValid },
        } = useForm({
          mode: 'onChange',
        });

        return (
          <form>
            <Controller
              control={control}
              render={({ field }) => <input {...field} />}
              name={'test'}
              defaultValue="Any default value!"
            />
            <p>isValid = {isValid ? 'true' : 'false'}</p>
            <button>Submit</button>
          </form>
        );
      }

      render(<App />);

      expect(await screen.findByText('isValid = true')).toBeVisible();
    });
  });

  it('should not update dirty fields during blur event', async () => {
    let dirtyFieldsState = {};

    const App = () => {
      const {
        handleSubmit,
        register,
        formState: { dirtyFields },
      } = useForm();

      dirtyFieldsState = dirtyFields;

      return (
        <form onSubmit={handleSubmit(() => {})}>
          <input
            {...register('test', { setValueAs: (value) => value + '1' })}
          />
          <input type="submit" />
        </form>
      );
    };

    render(<App />);

    fireEvent.blur(screen.getByRole('textbox'));

    expect(dirtyFieldsState).toEqual({});
  });

  describe('when delay config is set', () => {
    const message = 'required.';

    it('should only show error after 500ms with register', async () => {
      jest.useFakeTimers();

      const App = () => {
        const {
          register,
          formState: { errors },
        } = useForm<{
          test: string;
        }>({
          delayError: 500,
          mode: 'onChange',
        });

        return (
          <div>
            <input
              {...register('test', {
                maxLength: 4,
              })}
            />
            {errors.test && <p>{message}</p>}
          </div>
        );
      };

      render(<App />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: {
          value: '123456',
        },
      });

      expect(screen.queryByText(message)).not.toBeInTheDocument();

      jest.advanceTimersByTime(500);

      expect(await screen.findByText(message)).toBeVisible();
    });

    it('should only show error after 500ms with Controller', async () => {
      const App = () => {
        const {
          control,
          formState: { errors },
        } = useForm<{
          test: string;
        }>({
          delayError: 500,
          mode: 'onChange',
        });

        return (
          <div>
            <Controller
              render={({ field }) => <input {...field} />}
              rules={{
                maxLength: 4,
              }}
              control={control}
              name="test"
              defaultValue=""
            />
            {errors.test && <p>{message}</p>}
          </div>
        );
      };

      render(<App />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: {
          value: '123456',
        },
      });

      expect(screen.queryByText(message)).not.toBeInTheDocument();

      actComponent(() => {
        jest.advanceTimersByTime(500);
      });

      expect(await screen.findByText(message)).toBeVisible();
    });

    it('should prevent error from showing once input is validated', async () => {
      jest.useFakeTimers();

      const App = () => {
        const {
          register,
          formState: { errors, isDirty },
        } = useForm<{
          test: string;
        }>({
          delayError: 500,
          mode: 'onChange',
        });

        return (
          <div>
            <p>Dirty: {isDirty.toString()}</p>
            <input
              {...register('test', {
                maxLength: 4,
              })}
            />
            {errors.test && <p>{message}</p>}
          </div>
        );
      };

      render(<App />);

      const input = screen.getByRole('textbox');

      fireEvent.change(input, {
        target: {
          value: '123456',
        },
      });

      expect(await screen.findByText('Dirty: true')).toBeVisible();
      expect(screen.queryByText(message)).not.toBeInTheDocument();

      fireEvent.change(input, {
        target: {
          value: '123',
        },
      });
      expect(screen.queryByText(message)).not.toBeInTheDocument();

      await actComponent(async () => {
        jest.advanceTimersByTime(500);
      });

      expect(screen.queryByText(message)).not.toBeInTheDocument();
    });

    describe('when delayError is provided', () => {
      it('should only show error after 500ms with register and render formState instantly', async () => {
        jest.useFakeTimers();

        const message = 'required.';

        const App = () => {
          const {
            register,
            formState: { errors, isValid },
          } = useForm<{
            test: string;
          }>({
            delayError: 500,
            mode: 'onChange',
          });

          return (
            <div>
              {isValid ? 'valid' : 'inValid'}
              <input
                {...register('test', {
                  required: true,
                  maxLength: 4,
                })}
              />
              {errors.test && <p>{message}</p>}
            </div>
          );
        };

        render(<App />);

        fireEvent.change(screen.getByRole('textbox'), {
          target: {
            value: '123',
          },
        });

        expect(screen.queryByText(message)).not.toBeInTheDocument();

        expect(await screen.findByText('valid')).toBeVisible();

        await actComponent(async () => {
          fireEvent.change(screen.getByRole('textbox'), {
            target: {
              value: '',
            },
          });
        });

        await actComponent(async () => {
          await waitFor(() => screen.getByText('inValid'));
        });

        expect(screen.queryByText(message)).toBeNull();

        actComponent(() => {
          jest.advanceTimersByTime(500);
        });

        expect(await screen.findByText(message)).toBeVisible();
      });
    });
  });
});
