const Immutable = require('immutable');
const assert = require('assert');

function transformForNonNested(error) {
  return error.map(value => {
      if (value.size === 0)
          return;
      else if (Immutable.Map.isMap(value))
          return transformForNonNested(value);
      else if (Immutable.List.isList(value))
          return value.join('. ').toString();
      else
          return value;
  }).filter(err => err != undefined ).reduce((totalError, err) => {
      if (totalError === '')
          totalError = err;
      else {
          err.split('. ').map(subErr => {
              if (totalError.indexOf(subErr) === -1) {
                  totalError = totalError + '. ' + subErr;
              }
          });
      }
      return totalError;
  }, '');
}

function transformForNested(error) {
  return error.map((value, key) => {
      if (value.size === 0)
          return value;
      else if (Immutable.Map.isMap(value))
          return transformForNested(value);
      else if (Immutable.List.isList(value))
          return value.join('. ').toString() + '.';
  });
}

function transformErrors(errors, nestedKeys) {  
  return Immutable.Map(errors).map((value, key) => {
      if (nestedKeys.indexOf(key) === -1)
          return transformForNonNested(value) + '.';
      else
          return transformForNested(value);
  });
}

it('should tranform errors', () => {
  // example error object returned from API converted to Immutable.Map
  const errors = Immutable.fromJS({
    name: ['This field is required'],
    age: ['This field is required', 'Only numeric characters are allowed'],
    urls: [{}, {}, {
      site: {
        code: ['This site code is invalid'],
        id: ['Unsupported id'],
      }
    }],
    url: {
      site: {
        code: ['This site code is invalid'],
        id: ['Unsupported id'],
      }
    },
    tags: [{}, {
      non_field_errors: ['Only alphanumeric characters are allowed'],
      another_error: ['Only alphanumeric characters are allowed'],
      third_error: ['Third error']
    }, {}, {
      non_field_errors: [
        'Minumum length of 10 characters is required',
        'Only alphanumeric characters are allowed',
      ],
    }],
    tag: {
      nested: {
        non_field_errors: ['Only alphanumeric characters are allowed'],
      },
    },
  });

  // in this specific case,
  // errors for `url` and `urls` keys should be nested
  // see expected object below
  const result = transformErrors(errors, ['urls', 'url']);

  assert.deepEqual(result.toJS(), {
    name: 'This field is required.',
    age: 'This field is required. Only numeric characters are allowed.',
    urls: [{}, {}, {
      site: {
        code: 'This site code is invalid.',
        id: 'Unsupported id.',
      },
    }],
    url: {
      site: {
        code: 'This site code is invalid.',
        id: 'Unsupported id.',
      },
    },
    tags: 'Only alphanumeric characters are allowed. Third error. ' +
      'Minumum length of 10 characters is required.',
    tag: 'Only alphanumeric characters are allowed.',
  });
});
